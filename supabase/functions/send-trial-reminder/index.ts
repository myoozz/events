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
        await sendWhatsApp(tenant.contact_phone, 'me_trail_reminder', {
          body_1: { type: 'text', value: tenant.contact_name },
          body_2: { type: 'text', value: String(daysLeft) },
        })
        await sendEmail(
          tenant.contact_email,
          `Your ME trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
          trialReminderHtml(tenant.contact_name, tenant.name, daysLeft, endDate)
        )
      } else {
        await sendWhatsApp(tenant.contact_phone, 'me_trail_expired', {
          body_1: { type: 'text', value: tenant.contact_name },
          body_2: { type: 'text', value: tenant.name },
        })
        await sendEmail(
          tenant.contact_email,
          'Your ME trial has ended',
          trialExpiredHtml(tenant.contact_name, tenant.name)
        )
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
