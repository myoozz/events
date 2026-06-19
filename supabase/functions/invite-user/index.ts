import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authorizeInvite } from '../_shared/invite-authz.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, tenant_id, role, full_name, resend_only } = await req.json()
    if (!email) return json({ error: 'email is required' }, 400)
    if (!resend_only && (!tenant_id || !role)) return json({ error: 'tenant_id and role are required' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── resend_only: re-fire the invite email only. No user/grant change, no new auth. ──
    if (resend_only) {
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
      if (inviteError) throw inviteError
      return json({ success: true })
    }

    // ── grant path: authenticate + authorize the caller BEFORE creating anything ──
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Missing Authorization header' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid or expired token' }, 401)

    const { data: caller, error: callerErr } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, status, platform_role')
      .eq('auth_id', user.id)
      .single()
    if (callerErr || !caller) return json({ error: 'Caller not provisioned' }, 403)

    const verdict = authorizeInvite(
      { id: caller.id, role: caller.role, tenantId: caller.tenant_id, platformRole: caller.platform_role, status: caller.status },
      { tenantId: tenant_id, role },
    )
    if (!verdict.ok) return json({ error: verdict.error }, verdict.status)

    // ── authorized: invite + create user row + grant events access ──
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (inviteError) throw inviteError
    const authUserId = inviteData?.user?.id
    if (!authUserId) throw new Error('No auth user ID returned from invite')

    const { data: newUser, error: insertErr } = await supabaseAdmin
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
      .select('id')
      .single()
    if (insertErr) throw insertErr

    // Inline app_access grant (mirrors users.role). user row exists even if this
    // fails — a re-invite upserts it; we surface the error rather than rolling back.
    const { error: grantErr } = await supabaseAdmin
      .from('app_access')
      .upsert(
        { user_id: newUser.id, app: 'events', role, granted_by: caller.id },
        { onConflict: 'user_id,app' },
      )
    if (grantErr) return json({ error: `User created but access grant failed; re-invite to retry: ${grantErr.message}` }, 500)

    // MSG91 — team invite branded companion email (best-effort)
    try {
      const { sendEmail } = await import('../_shared/msg91.ts')
      await sendEmail(email, 'me_team_invite_email', {
        inviter_name: 'Your team admin',
        company_name: 'your workspace',
        role,
        invite_link: 'https://myoozz.events',
      })
    } catch (err) {
      console.error('MSG91 invite error:', err)
    }

    return json({ success: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
