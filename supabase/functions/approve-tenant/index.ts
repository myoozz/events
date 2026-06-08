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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller is super_admin via JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing Authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate the JWT by calling getUser() with the caller's token
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid or expired token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Read platform_role from JWT payload (injected by custom_access_token_hook)
  const [, payloadB64] = token.split('.')
  let platformRole: string | undefined
  try {
    const payload = JSON.parse(atob(payloadB64))
    platformRole = payload.platform_role
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Malformed JWT payload' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (platformRole !== 'super_admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Forbidden: super_admin only' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Service-role client for all DB writes
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  try {
    const body = await req.json()
    const { tenant_id, trial_days, approved_by_email, action, waitlist_reason } = body

    if (!tenant_id || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'tenant_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action !== 'approve' && action !== 'waitlist') {
      return new Response(
        JSON.stringify({ success: false, error: 'action must be "approve" or "waitlist"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'approve') {
      if (!trial_days || !approved_by_email) {
        return new Response(
          JSON.stringify({ success: false, error: 'trial_days and approved_by_email are required for approve' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch tenant row for MSG91 notification
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, contact_name, contact_email, contact_phone')
        .eq('id', tenant_id)
        .single()

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          status: 'active',
          trial_days_granted: trial_days,
          trial_ends_at: new Date(Date.now() + trial_days * 24 * 60 * 60 * 1000).toISOString(),
          approved_at: new Date().toISOString(),
          approved_by_email,
        })
        .eq('id', tenant_id)

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Approve update failed: ' + updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // MSG91 — workspace approved (WA + email)
      if (tenant) {
        try {
          const { sendWhatsApp, sendEmail } = await import('../_shared/msg91.ts')
          await sendWhatsApp(tenant.contact_phone, 'me_workspace_approved', [tenant.contact_name, tenant.name, String(trial_days)])
          await sendEmail(
            tenant.contact_email,
            'me_workspace_approved_email',
            {
              name: tenant.contact_name,
              company_name: tenant.name,
              trial_days: String(trial_days),
            }
          )
        } catch (err) {
          console.error('MSG91 approve error:', err)
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: 'approve', tenant_id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // action === 'waitlist'
    // Fetch tenant row for MSG91 notification
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, contact_name, contact_email')
      .eq('id', tenant_id)
      .single()

    const { error: waitlistError } = await supabase
      .from('tenants')
      .update({
        status: 'waitlisted',
        reject_reason: waitlist_reason ?? null,
      })
      .eq('id', tenant_id)

    if (waitlistError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Waitlist update failed: ' + waitlistError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // MSG91 — waitlist notification (email only)
    if (tenant) {
      try {
        const { sendEmail } = await import('../_shared/msg91.ts')
        await sendEmail(
          tenant.contact_email,
          'me_waitlist_email',
          { name: tenant.contact_name, company_name: tenant.name }
        )
      } catch (err) {
        console.error('MSG91 waitlist error:', err)
      }
    }

    return new Response(
      JSON.stringify({ success: true, action: 'waitlist', tenant_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
