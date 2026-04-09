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
    const { email } = await req.json()
    if (!email) throw new Error('Email is required')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#F4F3F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F0;padding:40px 16px;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FAFAF8;border-radius:12px;overflow:hidden;border:1px solid rgba(26,25,21,0.08);"><tr><td style="padding:28px 40px;border-bottom:1px solid rgba(26,25,21,0.08);"><table cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;padding-right:10px;"><div style="width:30px;height:30px;background:#bc1723;border-radius:7px;text-align:center;line-height:30px;font-size:11px;font-weight:700;color:#fff;letter-spacing:-0.5px;">ME</div></td><td style="vertical-align:middle;"><span style="font-size:15px;font-weight:500;color:#1A1917;">Myoozz Events</span></td></tr></table></td></tr><tr><td style="padding:40px 40px 32px;"><p style="font-size:28px;font-weight:600;color:#1A1917;margin:0 0 10px;line-height:1.2;font-family:Georgia,'Times New Roman',serif;letter-spacing:-0.3px;">You're all set.</p><p style="font-size:15px;color:#5C574F;margin:0 0 28px;line-height:1.7;font-weight:300;">Your password has been set. Your account is now active on Myoozz Events.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3F0;border-radius:8px;margin-bottom:28px;border:1px solid rgba(26,25,21,0.08);"><tr><td style="padding:20px 24px;"><p style="font-size:11px;font-weight:600;color:#9C9488;text-transform:uppercase;letter-spacing:0.8px;margin:0 0 16px;">Your login details — keep this email safe</p><p style="font-size:12px;color:#9C9488;margin:0 0 4px;">Login email</p><p style="font-size:15px;color:#1A1917;font-family:monospace;font-weight:500;margin:0 0 16px;">${email}</p><p style="font-size:12px;color:#9C9488;margin:0 0 4px;">Login URL</p><p style="font-size:13px;color:#bc1723;font-family:monospace;margin:0;">https://myoozz.events/login</p></td></tr></table><div style="background:#F4F3F0;border-left:3px solid #bc1723;border-radius:0 6px 6px 0;padding:14px 18px;margin-bottom:28px;"><p style="font-size:12px;color:#5C574F;margin:0;line-height:1.7;">Your password is never stored or shared by us. If you forget it, use the <strong>Forgot password</strong> link on the sign in page.</p></div><table cellpadding="0" cellspacing="0"><tr><td><a href="https://myoozz.events/login" style="display:inline-block;background:#bc1723;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:500;letter-spacing:0.2px;">Sign in to Myoozz Events →</a></td></tr></table></td></tr><tr><td style="background:#F4F3F0;padding:20px 40px;border-top:1px solid rgba(26,25,21,0.08);"><p style="font-size:11px;color:#9C9488;margin:0 0 2px;">Myoozz Events · Myoozz Consulting Pvt. Ltd. · Noida, India</p><p style="font-size:11px;color:#9C9488;margin:0;">Born in India · Built for the world · <a href="https://www.themyoozz.com" style="color:#bc1723;text-decoration:none;">www.themyoozz.com</a></p></td></tr></table></td></tr></table></body></html>`

    await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ type: 'email', email: email, options: { subject: 'Your Myoozz Events account is ready', html: emailHtml } }),
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
