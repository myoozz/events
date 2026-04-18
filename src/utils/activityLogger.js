import { supabase } from '../supabase'

/**
 * Log an activity to the activity_log table.
 * Call this after any meaningful user action. Failures are silent — never blocks the main flow.
 * Session is fetched internally — no need to pass it at the call site.
 *
 * @param {Object} params
 * @param {string}  params.action        — e.g. 'created', 'archived', 'assigned', 'completed'
 * @param {string}  params.entity_type   — 'event' | 'element' | 'task' | 'proposal' | 'user' | 'category'
 * @param {string}  [params.entity_name] — Display name shown in the log
 * @param {string}  [params.event_id]    — UUID of the related event (if applicable)
 * @param {Object}  [params.details]     — Extra key/value pairs shown as metadata
 *
 * Usage:
 *   import { logActivity } from '../utils/activityLogger'
 *   await logActivity({ action: 'created', entity_type: 'event', entity_name: ev.event_name })
 */
export async function logActivity({ action, entity_type, entity_name, event_id, details }) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { error } = await supabase.from('activity_log').insert({
      action,
      entity_type,
      entity_name:  entity_name || null,
      event_id:     event_id    || null,
      details:      details     || {},
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

// ── Convenience wrappers ─────────────────────────────────────────────────────

// Events
export const logEventCreated  = (ev) =>
  logActivity({ action: 'created',  entity_type: 'event', entity_name: ev.event_name, event_id: ev.id })

export const logEventArchived = (ev) =>
  logActivity({ action: 'archived', entity_type: 'event', entity_name: ev.event_name, event_id: ev.id })

export const logEventRestored = (ev) =>
  logActivity({ action: 'restored', entity_type: 'event', entity_name: ev.event_name, event_id: ev.id })

export const logEventAssigned = (ev, email) =>
  logActivity({ action: 'assigned', entity_type: 'event', entity_name: ev.event_name, event_id: ev.id, details: { to: email } })

// Elements
export const logElementCreated = (el, eventName) =>
  logActivity({ action: 'created', entity_type: 'element', entity_name: el.element_name, event_id: el.event_id, details: { event: eventName, city: el.city } })

export const logElementDeleted = (el, eventName) =>
  logActivity({ action: 'deleted', entity_type: 'element', entity_name: el.element_name, event_id: el.event_id, details: { event: eventName, city: el.city } })

// Categories
export const logCategoryAdded = (name, eventId) =>
  logActivity({ action: 'created', entity_type: 'category', entity_name: name, event_id: eventId })

export const logCategoryDeleted = (name, eventId) =>
  logActivity({ action: 'deleted', entity_type: 'category', entity_name: name, event_id: eventId })

// Tasks
export const logTaskCreated = (task, eventName) =>
  logActivity({ action: 'created',  entity_type: 'task', entity_name: task.title, event_id: task.event_id, details: { event: eventName } })

export const logTaskCompleted = (task, eventName) =>
  logActivity({ action: 'completed', entity_type: 'task', entity_name: task.title, event_id: task.event_id, details: { event: eventName } })

export const logTaskAssigned = (task, toName, eventName) =>
  logActivity({ action: 'assigned', entity_type: 'task', entity_name: task.title, event_id: task.event_id, details: { to: toName, event: eventName } })

export const logTaskStatusChanged = (task, oldStatus, newStatus) =>
  logActivity({ action: 'status changed', entity_type: 'task', entity_name: task.title, event_id: task.event_id, details: { from: oldStatus, to: newStatus } })

// Proposals
export const logProposalGenerated  = (ev) =>
  logActivity({ action: 'generated',  entity_type: 'proposal', entity_name: ev.event_name, event_id: ev.id })

export const logProposalDownloaded = (ev) =>
  logActivity({ action: 'downloaded', entity_type: 'proposal', entity_name: ev.event_name, event_id: ev.id })

// Users
export const logUserInvited = (email, role) =>
  logActivity({ action: 'invited', entity_type: 'user', entity_name: email, details: { role } })
