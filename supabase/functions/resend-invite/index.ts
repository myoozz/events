import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, email } = await req.json()
    if (!user_id || !email) throw new Error('user_id and email are required')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    // Verify caller is admin or super_admin via JWT
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) throw new Error('Unauthorized')

    let callerPayload: Record<string, unknown> = {}
    try {
      callerPayload = JSON.parse(atob(token.split('.')[1]))
    } catch {
      throw new Error('Invalid token')
    }

    const platformRole = callerPayload.platform_role as string | undefined
    const callerRole = callerPayload.role as string | undefined

    if (platformRole !== 'super_admin' && callerRole !== 'admin') {
      throw new Error('Unauthorized — admin or super_admin required')
    }

    // Re-send auth invite
    const inviteRes = await fetch(`${supabaseUrl}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email }),
    })

    const inviteJson = await inviteRes.json()
    // Ignore "already registered" — treat as success
    if (!inviteRes.ok && !inviteJson.msg?.toLowerCase().includes('already registered')) {
      throw new Error(inviteJson.msg || inviteJson.error_description || 'Invite failed')
    }

    // Update invited_at timestamp
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(user_id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      }),
    })

    if (!updateRes.ok) {
      const updateErr = await updateRes.json()
      throw new Error(updateErr.message || 'Failed to update invited_at')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
