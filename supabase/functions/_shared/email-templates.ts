/**
 * ME Email Templates
 * All transactional email HTML for MSG91.
 * Each function accepts token values and returns a complete HTML string.
 *
 * Sender: noreply@mail.myoozz.events
 */

function wrap(headerBg: string, eyebrowColor: string, eyebrow: string, headline: string, subhead: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#1a1008;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1008;padding:36px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#faf8f5;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="background:${headerBg};padding:36px 36px 32px;">
            <div style="font-size:11px;letter-spacing:2px;color:${eyebrowColor};font-weight:700;text-transform:uppercase;font-family:'DM Sans',Arial,sans-serif;margin-bottom:16px;">${eyebrow}</div>
            <h1 style="margin:0 0 14px 0;font-size:32px;line-height:1.2;color:#faf8f5;font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;">${headline}</h1>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#c5b89a;font-family:'DM Sans',Arial,sans-serif;">${subhead}</p>
          </td>
        </tr>
        <tr><td style="padding:36px;">${body}</td></tr>
        <tr>
          <td style="padding:22px 36px;background:#f2efe9;border-top:1px solid #d8d2c8;">
            <p style="margin:0;font-size:13px;line-height:1.7;color:#7a7060;font-family:'DM Sans',Arial,sans-serif;">Powered By Myoozz Consulting Pvt. Ltd.</p>
          </td>
        </tr>
      </table>
      <p style="font-size:12px;color:#7a7060;margin-top:16px;font-family:'DM Sans',Arial,sans-serif;">System email from ME &middot; myoozz.events</p>
    </td></tr>
  </table>
</body>
</html>`
}

function p(text: string, dim = false): string {
  const color = dim ? '#7a7060' : '#1a1008'
  return `<p style="font-size:16px;line-height:1.7;color:${color};margin:0 0 16px 0;font-family:'DM Sans',Arial,sans-serif;">${text}</p>`
}

function accent(text: string, color = '#bc1723', bg = '#fdf0f0'): string {
  return `<div style="background:${bg};border-left:4px solid ${color};padding:18px 22px;border-radius:0 12px 12px 0;margin:24px 0;"><p style="margin:0;font-size:16px;line-height:1.7;color:#1a1008;font-family:'DM Sans',Arial,sans-serif;">${text}</p></div>`
}

function cta(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 0 0;"><tr><td style="background:#bc1723;border-radius:10px;"><a href="${href}" style="display:inline-block;padding:14px 26px;color:#faf8f5;text-decoration:none;font-size:15px;font-weight:600;font-family:'DM Sans',Arial,sans-serif;">${label}</a></td></tr></table>`
}

function note(text: string): string {
  return `<p style="font-size:14px;line-height:1.7;color:#7a7060;margin:24px 0 0 0;font-family:'DM Sans',Arial,sans-serif;">${text}</p>`
}

export function registrationConfirmationHtml(name: string, companyName: string): string {
  const body = p(`Hi ${name},`) + p(`Thank you for registering <strong>${companyName}</strong> on ME.`) + p('We are reviewing your workspace carefully because ME is being built for serious event teams who want better control, cleaner coordination, and real visibility across projects.', true) + accent('Once approved, your team will get access to a workspace designed to bring projects, vendors, teams, approvals, and client updates into one operating layer.') + p("This usually takes a few hours. We'll notify you as soon as your workspace is ready.", true) + cta('Explore ME', 'https://myoozz.events') + note('You are early. That means your feedback can help shape what ME becomes for event teams like yours.')
  return wrap('#16203A', '#bc1723', 'ME &middot; Myoozz Events', 'your event operating system is taking shape.', 'We have received your registration. Your workspace is now under review.', body)
}

export function workspaceApprovedHtml(name: string, companyName: string, trialDays: number): string {
  const body = p(`Hi ${name},`) + p(`<strong>${companyName}</strong> is now live on ME.`) + accent(`Your <strong>${trialDays}-day trial</strong> has started. Your team can now log in, create events, build cost sheets, assign tasks, and manage your full operations from one place.`, '#16a34a', '#f0fdf4') + p('Here is what you can do right now:', true) + p('&rarr; Create your first event and add your cities<br>&rarr; Invite your team and set their roles<br>&rarr; Start building your element cost sheet<br>&rarr; Set your internal rate card benchmarks', true) + cta('Open Workspace', 'https://myoozz.events') + note('Your data is yours. We never share it, export it, or show it to anyone outside your workspace.')
  return wrap('#16203A', '#4ade80', 'ME &middot; Myoozz Events', "you're in.", 'Your workspace has been approved and your trial has started.', body)
}

export function waitlistHtml(name: string, companyName: string): string {
  const body = p(`Hi ${name},`) + p(`Thanks for registering <strong>${companyName}</strong> on ME.`) + accent("We're onboarding event teams carefully — not because ME isn't ready, but because we want every team that comes in to get proper attention from day one. You'll be notified the moment your workspace opens.", '#3b82f6', '#eff6ff') + p("No action needed from your side. We'll reach out directly when your turn is up — usually within a few days.", true) + p("In the meantime, if you have questions or want to tell us more about your team and the events you run, just reply to this email. We read every one.", true) + cta('Explore ME', 'https://myoozz.events')
  return wrap('#16203A', '#93c5fd', 'ME &middot; Myoozz Events', "you're on the list.", "We're onboarding teams in batches. You're in the queue.", body)
}

export function trialReminderHtml(name: string, companyName: string, daysLeft: number, trialEndDate: string): string {
  const body = p(`Hi ${name},`) + p(`Your ME trial for <strong>${companyName}</strong> ends on <strong>${trialEndDate}</strong>.`) + accent('Your events, cost sheets, rate cards, team members, and task history will remain intact. To keep uninterrupted access after your trial, just reach out and we will get you set up on the right plan for your team size.', '#d97706', '#fffbeb') + p("This isn't a hard stop — it's a conversation. If ME has been useful, we'd love to continue with you.", true) + cta('Talk to Us', 'https://myoozz.events') + note('Questions about what happens after the trial? Reply to this email directly.')
  return wrap('#16203A', '#fbbf24', 'ME &middot; Myoozz Events', `your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`, 'Your workspace and everything in it stays safe. Here is what to know.', body)
}

export function trialExpiredHtml(name: string, companyName: string): string {
  const body = p(`Hi ${name},`) + p(`Your ME trial for <strong>${companyName}</strong> has ended.`) + accent('<strong>Your data is completely safe.</strong> Your events, cost sheets, team, rate cards, and task history are all preserved. Nothing has been deleted. Access is simply paused until you continue.') + p("If ME made a difference during the trial — even a small one — we'd like to continue building that with you. Just reach out and we'll figure out the right next step together.", true) + cta('Talk to Us', 'mailto:vikram@themyoozz.com') + note('Reply to this email or reach us at vikram@themyoozz.com. We will respond the same day.')
  return wrap('#16203A', '#f87171', 'ME &middot; Myoozz Events', 'your trial has ended.', 'Your workspace is safe. Here is how to reactivate.', body)
}

export function teamInviteHtml(inviterName: string, companyName: string, role: string, inviteLink: string): string {
  const body = p('Hi there,') + p(`<strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on ME as a <strong>${role}</strong>.`) + accent(`ME is the operations platform ${companyName} uses to manage events — cost sheets, task assignments, team coordination, and client documents — all in one place.`) + p('Click the button below to set your password and access your workspace. This invite link expires in <strong>7 days</strong>.', true) + cta('Accept Invite', inviteLink) + note(`If you were not expecting this invite or do not recognise ${companyName}, you can safely ignore this email.`)
  return wrap('#16203A', '#bc1723', 'ME &middot; Myoozz Events', "you've been invited to join the team.", `${inviterName} has added you to their ME workspace.`, body)
}

export function passwordResetHtml(name: string, resetLink: string): string {
  const body = p(`Hi ${name},`) + p('We received a request to reset the password for your ME account.') + accent('Click the button below to set a new password. This link is valid for <strong>1 hour</strong> and can only be used once.') + cta('Reset Password', resetLink) + note('If you did not request a password reset, you can safely ignore this email. Your account remains secure and unchanged.')
  return wrap('#16203A', '#bc1723', 'ME &middot; Myoozz Events', "let's get you back in.", "You requested a password reset. Here's your link.", body)
}

export function registrationAlertHtml(companyName: string, contactName: string, contactEmail: string, contactPhone: string, signupTime: string): string {
  const dataBlock = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1008;border-radius:12px;overflow:hidden;margin:20px 0 28px 0;"><tr><td style="padding:0 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr style="border-bottom:1px solid #2e2010;"><td style="font-size:11px;color:#7a7060;text-transform:uppercase;letter-spacing:0.8px;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">Company</td><td align="right" style="font-size:14px;color:#faf8f5;font-weight:600;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">${companyName}</td></tr><tr style="border-bottom:1px solid #2e2010;"><td style="font-size:11px;color:#7a7060;text-transform:uppercase;letter-spacing:0.8px;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">Contact</td><td align="right" style="font-size:14px;color:#faf8f5;font-weight:600;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">${contactName}</td></tr><tr style="border-bottom:1px solid #2e2010;"><td style="font-size:11px;color:#7a7060;text-transform:uppercase;letter-spacing:0.8px;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">Email</td><td align="right" style="font-size:14px;color:#faf8f5;font-weight:600;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">${contactEmail}</td></tr><tr style="border-bottom:1px solid #2e2010;"><td style="font-size:11px;color:#7a7060;text-transform:uppercase;letter-spacing:0.8px;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">Phone</td><td align="right" style="font-size:14px;color:#faf8f5;font-weight:600;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">${contactPhone}</td></tr><tr><td style="font-size:11px;color:#7a7060;text-transform:uppercase;letter-spacing:0.8px;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">Registered</td><td align="right" style="font-size:14px;color:#faf8f5;font-weight:600;padding:12px 0;font-family:'DM Sans',Arial,sans-serif;">${signupTime}</td></tr></table></td></tr></table>`
  const body = p(`A new workspace registration came in at <strong>${signupTime}</strong>.`) + dataBlock + cta('Review in SA Panel', 'https://myoozzevents.netlify.app/super-admin') + note('Internal system alert. Do not forward.')
  return wrap('#1c1109', '#fb923c', 'ME &middot; Internal Alert', 'new registration received.', 'A company has signed up and is pending your review.', body)
}
