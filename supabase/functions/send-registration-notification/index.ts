import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const WA_NAMESPACE = '0a1b7e6a_9ea1_457e_a42c_2257bc561bb7'
const WA_INTEGRATED_NUMBER = '15559255157'
const EMAIL_TEMPLATE_ID = 'me_registration_received_email'
const EMAIL_DOMAIN = 'mail.myoozz.events'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

async function sendWhatsApp(
  authKey: string,
  recipientPhone: string,
  name: string,
): Promise<{ sent: boolean; status: unknown }> {
  const payload = {
    integrated_number: WA_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: 'me_registration_received',
        language: { code: 'en', policy: 'deterministic' },
        namespace: WA_NAMESPACE,
        to_and_components: [
          {
            to: [recipientPhone],
            components: {
              body_1: {
                type: 'text',
                value: name,
              },
            },
          },
        ],
      },
    },
  }

  console.log('[WA] Sending to:', recipientPhone)

  const res = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({ raw: res.status }))
  const sent = res.ok
  console.log('[WA] Response:', JSON.stringify(data))
  return { sent, status: data }
}

async function sendEmail(
  authKey: string,
  toEmail: string,
  toName: string,
  companyName: string,
): Promise<{ sent: boolean; status: unknown }> {
  const payload = {
    template_id: EMAIL_TEMPLATE_ID,
    domain: EMAIL_DOMAIN,
    from: {
      name: 'ME by Myoozz',
      email: 'no-reply@mail.myoozz.events',
    },
    to: [{ name: toName, email: toEmail }],
    variables: {
      name: toName,
      company_name: companyName,
    },
  }

  console.log('[EMAIL] Sending to:', toEmail)

  const res = await fetch('https://api.msg91.com/api/v5/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => ({ raw: res.status }))
  const sent = res.ok
  console.log('[EMAIL] Response:', JSON.stringify(data))
  return { sent, status: data }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
  }

  const authKey = Deno.env.get('MSG91_AUTH_KEY')

  if (!authKey) {
    console.error('[CONFIG] Missing MSG91_AUTH_KEY')
    return jsonResponse({ success: false, error: 'Server configuration error' }, 500)
  }

  let body: { name?: string; company_name?: string; email?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const { name, company_name, email, phone } = body

  if (!name || !company_name || !email || !phone) {
    return jsonResponse(
      { success: false, error: 'name, company_name, email, and phone are required' },
      400,
    )
  }

  const recipientPhone = cleanPhone(phone)
  console.log('[REG] Registration for:', name, '|', company_name, '| phone:', recipientPhone)

  const [waResult, emailResult] = await Promise.allSettled([
    sendWhatsApp(authKey, recipientPhone, name),
    sendEmail(authKey, email, name, company_name),
  ])

  const wa =
    waResult.status === 'fulfilled'
      ? waResult.value
      : { sent: false, status: (waResult as PromiseRejectedResult).reason?.message ?? 'error' }

  const em =
    emailResult.status === 'fulfilled'
      ? emailResult.value
      : { sent: false, status: (emailResult as PromiseRejectedResult).reason?.message ?? 'error' }

  const overallSuccess = wa.sent || em.sent
  console.log('[DONE] WA sent:', wa.sent, '| Email sent:', em.sent)

  return jsonResponse({ success: overallSuccess, whatsapp: wa, email: em })
})