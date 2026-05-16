import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, tenant_id, role, full_name, resend_only } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!resend_only && (!tenant_id || !role)) {
      return new Response(JSON.stringify({ error: 'tenant_id and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Service role client — needed for auth admin + users insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Step 1 — send auth invite email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (inviteError) throw inviteError

    const authUserId = inviteData?.user?.id
    if (!authUserId) throw new Error('No auth user ID returned from invite')

    // Resend path — skip users insert, auth invite already re-fired
    if (resend_only) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Step 2 — insert users row
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUserId,
        email,
        full_name: full_name ?? '',
        role,
        tenant_id,
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })

    if (userError) throw userError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
