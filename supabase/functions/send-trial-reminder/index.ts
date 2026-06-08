import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendWhatsApp, sendEmail } from '../_shared/msg91.ts'
import { trialReminderHtml, trialExpiredHtml } from '../_shared/email-templates.ts'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const daysLeft of [7, 3, 1, 0]) {
    const target = new Date(today)
    target.setDate(target.getDate() + daysLeft)
    const targetStr = target.toISOString().split('T')[0]

    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, contact_name, contact_email, contact_phone, trial_ends_at')
      .eq('status', 'active')
      .neq('plan', 'unlimited')
      .filter('trial_ends_at::date', 'eq', targetStr)

    if (error) { console.error('DB query error:', error); continue }
    if (!tenants?.length) continue

    for (const tenant of tenants) {
      const endDate = new Date(tenant.trial_ends_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

      if (daysLeft > 0) {
        await sendWhatsApp(tenant.contact_phone, 'me_trail_reminder', [tenant.contact_name, String(daysLeft)])
        await sendEmail(
          tenant.contact_email,
          'me_trial_reminder_email',
          {
            name: tenant.contact_name,
            company_name: tenant.name,
            days_left: String(daysLeft),
            trial_end_date: endDate,
          }
        )
      } else {
        await sendWhatsApp(tenant.contact_phone, 'me_trail_expired', [tenant.contact_name, tenant.name])
        await sendEmail(
          tenant.contact_email,
          'me_trial_expired_email',
          { name: tenant.contact_name, company_name: tenant.name }
        )
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
