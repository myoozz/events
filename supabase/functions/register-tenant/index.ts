import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    const body = await req.json()
    const {
      company_name,
      contact_name,
      email,
      phone,
      password,
      designation,
      gst_number,
      state,
    } = body

    // Step 1: Validate required fields
    if (!company_name || !contact_name || !email || !phone || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'company_name, contact_name, email, phone, password are required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Check for duplicate email in auth.users
    const checkRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?filter=email%3D${encodeURIComponent(email)}&per_page=1`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }
    )
    if (checkRes.ok) {
      const checkData = await checkRes.json()
      if (Array.isArray(checkData.users) && checkData.users.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email already registered' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Step 3: Create auth user (email pre-confirmed — no email sent)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      const isDupe =
        authError.message.toLowerCase().includes('already registered') ||
        authError.message.toLowerCase().includes('already exists')
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        {
          status: isDupe ? 409 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const authUserId = authData.user.id

    // Step 4: Insert into public.tenants
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: company_name,
        contact_name,
        contact_email: email,
        contact_phone: phone,
        designation: designation ?? null,
        gst_number: gst_number ?? null,
        state: state ?? null,
        status: 'pending_review',
        plan: 'trial',
      })
      .select('id')
      .single()

    if (tenantError) {
      await supabase.auth.admin.deleteUser(authUserId)
      return new Response(
        JSON.stringify({ success: false, error: 'Tenant insert failed: ' + tenantError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tenantId = tenantData.id

    // Step 5: Insert into public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_id: authUserId,
        email,
        full_name: contact_name,
        role: 'admin',
        tenant_id: tenantId,
      })
      .select('id')
      .single()

    if (userError) {
      // Rollback both tenant row and auth user
      await supabase.from('tenants').delete().eq('id', tenantId)
      await supabase.auth.admin.deleteUser(authUserId)
      return new Response(
        JSON.stringify({ success: false, error: 'User insert failed: ' + userError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenantId, user_id: userData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
