import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/msg91.ts'
import { buildRecoveryLink, getAllowedOrigins } from './link.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Anti-enumeration: the caller can never tell whether the email exists.
  const ok = () =>
    new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const { email, origin } = await req.json()
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Generate the recovery token. Unlike inviteUserByEmail, generateLink does
    // NOT send Supabase's own email — we mint the link and send it ourselves.
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    // Unknown email or any error -> generic success, send nothing.
    if (error || !data?.properties?.hashed_token) {
      console.error('reset generateLink:', error?.message ?? 'no hashed_token')
      return ok()
    }

    const link = buildRecoveryLink(origin, data.properties.hashed_token, getAllowedOrigins())
    const name = (data.user?.user_metadata?.full_name as string) || 'there'

    try {
      await sendEmail(email, 'me_password_reset', { name, reset_url: link })
      // Server-side only (visible in `supabase functions logs`) — lets us
      // confirm a send during testing without leaking to the HTTP response.
      console.log('reset: dispatched MSG91 reset email for', email)
    } catch (err) {
      console.error('reset MSG91 send error:', err)
    }
    return ok()
  } catch (err) {
    console.error('reset fn error:', (err as Error).message)
    return ok() // never leak internals / existence
  }
})
