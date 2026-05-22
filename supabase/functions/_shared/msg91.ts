const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY') ?? ''
const MSG91_INTEGRATED_NUMBER = '15559255157'
const MSG91_NAMESPACE = '0a1b7e6a_9ea1_457e_a42c_2257bc561bb7'
const MSG91_FROM_EMAIL = 'noreply@mail.myoozz.events'

interface WAComponent { type: 'text'; value: string }
interface WAComponents { [key: string]: WAComponent }

export async function sendWhatsApp(
  to: string,
  templateName: string,
  components: WAComponents
): Promise<void> {
  const phone = to.replace(/\D/g, '')
  const body = {
    integrated_number: MSG91_INTEGRATED_NUMBER,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en', policy: 'deterministic' },
        namespace: MSG91_NAMESPACE,
        to_and_components: [{ to: [phone], components }],
      },
    },
  }
  const res = await fetch(
    'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: MSG91_AUTH_KEY },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    console.error(`MSG91 WA error [${templateName}]:`, text)
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  const body = {
    to: [{ email: to }],
    from: { email: MSG91_FROM_EMAIL, name: 'ME by Myoozz Events' },
    subject,
    htmlContent,
  }
  const res = await fetch('https://api.msg91.com/api/v5/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: MSG91_AUTH_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`MSG91 Email error [${subject}]:`, text)
  }
}
