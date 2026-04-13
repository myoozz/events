import { supabase } from '../supabase'

/**
 * Log an activity to the activity_log table.
 * Call this after any meaningful user action. Failures are silent — never blocks the main flow.
 *
 * @param {Object} params
 * @param {string}  params.action       — e.g. 'created', 'archived', 'assigned', 'completed'
 * @param {string}  params.entity_type  — 'event' | 'element' | 'task' | 'proposal' | 'user' | 'category'
 * @param {string}  [params.entity_name] — Display name shown in the log
 * @param {string}  [params.event_id]   — UUID of the related event (if applicable)
 * @param {Object}  [params.details]    — Extra key/value pairs shown as metadata
 * @param {Object}  params.session      — Supabase session object (from props or useSession)
 *
 * Usage:
 *   import { logActivity } from '../utils/activityLogger'
 *   await logActivity({ action: 'created', entity_type: 'event', entity_name: ev.event_name, session })
 */
export async function logActivity({ action, entity_type, entity_name, event_id, details, session }) {
  if (!session?.user) return

  try {
    const { error } = await supabase.from('activity_log').insert({
      action,
      entity_type,
      entity_name:  entity_name  || null,
      event_id:     event_id     || null,
      details:      details      || {},
      user_id:      session.user.id,
      user_email:   session.user.email,
      user_name:    session.user.user_metadata?.full_name
                    || session.user.email?.split('@')[0]
                    || 'Unknown',
    })
    if (error) console.warn('activityLogger insert error:', error.message)
  } catch (err) {
    // Never crash the app over a logging failure
    console.warn('activityLogger failed silently:', err?.message)
  }
}

// ── Convenience wrappers (optional — reduces boilerplate at call sites) ──────

export const logEventCreated    = (ev, session) =>
  logActivity({ action: 'created',  entity_type: 'event',    entity_name: ev.event_name,  event_id: ev.id, session })

export const logEventArchived   = (ev, session) =>
  logActivity({ action: 'archived', entity_type: 'event',    entity_name: ev.event_name,  event_id: ev.id, session })

export const logEventRestored   = (ev, session) =>
  logActivity({ action: 'restored', entity_type: 'event',    entity_name: ev.event_name,  event_id: ev.id, session })

export const logEventAssigned   = (ev, email, session) =>
  logActivity({ action: 'assigned', entity_type: 'event',    entity_name: ev.event_name,  event_id: ev.id, details: { to: email }, session })

export const logTaskCreated     = (task, eventName, session) =>
  logActivity({ action: 'created',  entity_type: 'task',     entity_name: task.title,     event_id: task.event_id, details: { event: eventName }, session })

export const logTaskCompleted   = (task, eventName, session) =>
  logActivity({ action: 'completed',entity_type: 'task',     entity_name: task.title,     event_id: task.event_id, details: { event: eventName }, session })

export const logElementCreated  = (el, eventName, session) =>
  logActivity({ action: 'created',  entity_type: 'element',  entity_name: el.element_name, event_id: el.event_id, details: { event: eventName, city: el.city }, session })

export const logProposalGenerated = (ev, session) =>
  logActivity({ action: 'generated', entity_type: 'proposal', entity_name: ev.event_name, event_id: ev.id, session })

export const logProposalDownloaded = (ev, session) =>
  logActivity({ action: 'downloaded', entity_type: 'proposal', entity_name: ev.event_name, event_id: ev.id, session })

export const logUserInvited     = (email, role, session) =>
  logActivity({ action: 'invited',  entity_type: 'user',     entity_name: email, details: { role }, session })
