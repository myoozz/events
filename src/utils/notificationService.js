// ============================================================
// notificationService.js
// Myoozz Events — Phase C
// Path: src/utils/notificationService.js
// ============================================================
// All notification reads/writes go through here.
// Components never query the notifications table directly.
// Future: add WhatsApp/email dispatch here when MSG91 is ready.
// ============================================================

import { supabase } from '../supabase';

async function resolveUserId(authId) {
  if (!authId) return null;
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authId)
    .single();
  return data?.id ?? null;
}

// ─────────────────────────────────────────────
// NOTIFICATION TYPES (reference)
// ─────────────────────────────────────────────
export const NOTIF_TYPES = {
  TASK_ASSIGNED:        'task_assigned',
  EVENT_ASSIGNED:       'event_assigned',
  TASK_STATUS_CHANGED:  'task_status_changed',
  TASK_COMPLETED:       'task_completed',
  APPROVAL_REQUIRED:    'approval_required',
  EVENT_CREATED:        'event_created',
  RATE_CARD_REQUESTED:  'rate_card_requested',
};

// ─────────────────────────────────────────────
// ICON + COLOUR MAP (used in NotificationBell)
// ─────────────────────────────────────────────
export const NOTIF_META = {
  task_assigned:       { icon: '📋', colour: '#bc1723', label: 'Task Assigned' },
  event_assigned:      { icon: '📅', colour: '#2563eb', label: 'Event Assigned' },
  task_status_changed: { icon: '🔄', colour: '#d97706', label: 'Status Updated' },
  task_completed:      { icon: '✅', colour: '#16a34a', label: 'Task Completed' },
  approval_required:   { icon: '⏳', colour: '#bc1723', label: 'Needs Approval' },
  event_created:       { icon: '🎉', colour: '#7c3aed', label: 'New Event' },
  rate_card_requested: { icon: '💰', colour: '#d97706', label: 'Rate Requested' },
};

// ─────────────────────────────────────────────
// CREATE A NOTIFICATION
// ─────────────────────────────────────────────
// Called by TaskBoard, AssignEvent, Dashboard, NewEventForm.
// Pass a single notification object or an array for bulk inserts.
//
// Usage:
//   await createNotification({
//     user_id:      'uuid-of-recipient',
//     triggered_by: 'uuid-of-actor',
//     type:         NOTIF_TYPES.TASK_ASSIGNED,
//     title:        'New task assigned',
//     body:         'Site Survey — Pragati Maidan, Delhi',
//     entity_type:  'task',
//     entity_id:    'task-uuid',
//     event_id:     'event-uuid',
//     action_url:   '?tab=tasks',
//   });

export async function createNotification(payload) {
  const resolvedTriggeredBy = await resolveUserId(payload?.triggered_by ?? payload?.[0]?.triggered_by);

  // Support single object or array
  const rows = Array.isArray(payload) ? payload : [payload];

  // Filter out any rows where user_id is missing or is the same as triggered_by
  // (no self-notifications)
  const filtered = rows
    .filter((n) => n.user_id && n.user_id !== resolvedTriggeredBy)
    .map((n) => ({ ...n, triggered_by: resolvedTriggeredBy }));

  if (filtered.length === 0) return { data: null, error: null };

  const { data, error } = await supabase
    .from('notifications')
    .insert(filtered);

  if (error) {
    console.error('[notificationService] createNotification error:', error.message);
  }

  return { data, error };
}

// ─────────────────────────────────────────────
// CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────

/** Notify a user that a task was assigned to them */
export async function notifyTaskAssigned({ recipientId, actorId, taskTitle, eventName, eventId, taskId }) {
  return createNotification({
    user_id:      recipientId,
    triggered_by: actorId,
    type:         NOTIF_TYPES.TASK_ASSIGNED,
    title:        'New task assigned to you',
    body:         `${taskTitle}${eventName ? ` · ${eventName}` : ''}`,
    entity_type:  'task',
    entity_id:    taskId,
    event_id:     eventId,
    action_url:   `?tab=tasks`,
  });
}

/** Notify a user that an event was assigned to them */
export async function notifyEventAssigned({ recipientId, actorId, eventName, eventId }) {
  return createNotification({
    user_id:      recipientId,
    triggered_by: actorId,
    type:         NOTIF_TYPES.EVENT_ASSIGNED,
    title:        'You have been added to an event',
    body:         eventName,
    entity_type:  'event',
    entity_id:    eventId,
    event_id:     eventId,
    action_url:   `?event=${eventId}`,
  });
}

/** Notify task creator/manager that task status changed */
export async function notifyTaskStatusChanged({ recipientId, actorId, taskTitle, newStatus, eventName, eventId, taskId }) {
  const isCompleted = newStatus === 'done' || newStatus === 'completed';
  return createNotification({
    user_id:      recipientId,
    triggered_by: actorId,
    type:         isCompleted ? NOTIF_TYPES.TASK_COMPLETED : NOTIF_TYPES.TASK_STATUS_CHANGED,
    title:        isCompleted ? 'Task completed' : 'Task status updated',
    body:         `${taskTitle} → ${formatStatus(newStatus)}${eventName ? ` · ${eventName}` : ''}`,
    entity_type:  'task',
    entity_id:    taskId,
    event_id:     eventId,
    action_url:   `?tab=tasks`,
  });
}

/** Notify admin(s) that an event needs approval */
export async function notifyApprovalRequired({ adminIds = [], actorId, eventName, eventId }) {
  if (!adminIds.length) return;
  const notifications = adminIds.map((adminId) => ({
    user_id:      adminId,
    triggered_by: actorId,
    type:         NOTIF_TYPES.APPROVAL_REQUIRED,
    title:        'Event pending your approval',
    body:         eventName,
    entity_type:  'event',
    entity_id:    eventId,
    event_id:     eventId,
    action_url:   `?event=${eventId}`,
  }));
  return createNotification(notifications);
}

/** Notify admin(s) that a new event was created */
export async function notifyEventCreated({ adminIds = [], actorId, eventName, eventId }) {
  if (!adminIds.length) return;
  const notifications = adminIds.map((adminId) => ({
    user_id:      adminId,
    triggered_by: actorId,
    type:         NOTIF_TYPES.EVENT_CREATED,
    title:        'New event created',
    body:         eventName,
    entity_type:  'event',
    entity_id:    eventId,
    event_id:     eventId,
    action_url:   `?event=${eventId}`,
  }));
  return createNotification(notifications);
}

/** Notify all admins that a user asked for rates on an element */
export async function createRateCardRequestNotification({ requestingUser, elementName, category, eventId }) {
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'admin');

  if (!admins?.length) return;

  const notifications = admins.map((admin) => ({
    user_id:      admin.id,
    triggered_by: requestingUser.id,
    type:         NOTIF_TYPES.RATE_CARD_REQUESTED,
    title:        'Rate card requested',
    body:         `${requestingUser.full_name} asked for rates · ${elementName} · ${category}`,
    entity_type:  'rate_card',
    entity_id:    category,
    event_id:     eventId,
    action_url:   '/app/rate-card',
  }));

  return createNotification(notifications);
}


// ─────────────────────────────────────────────

/** Fetch last N notifications for a user (default 30) */
export async function fetchNotifications(userId, limit = 30) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id, type, title, body, entity_type, entity_id,
      event_id, action_url, is_read, created_at,
      triggered_by
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[notificationService] fetchNotifications error:', error.message);
    return [];
  }

  return data || [];
}

/** Get unread count for badge */
export async function fetchUnreadCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[notificationService] fetchUnreadCount error:', error.message);
    return 0;
  }

  return count || 0;
}

// ─────────────────────────────────────────────
// MARK AS READ
// ─────────────────────────────────────────────

/** Mark a single notification as read */
export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[notificationService] markNotificationRead error:', error.message);
  }
}

/** Mark ALL notifications as read for a user */
export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('[notificationService] markAllNotificationsRead error:', error.message);
  }
}

// ─────────────────────────────────────────────
// REALTIME SUBSCRIPTION
// ─────────────────────────────────────────────
// Used in AppShell to get live badge updates.
//
// Usage:
//   const unsub = subscribeToNotifications(userId, (newNotif) => {
//     setUnreadCount((c) => c + 1);
//     setNotifications((prev) => [newNotif, ...prev]);
//   });
//   // On unmount: unsub();

export function subscribeToNotifications(userId, onInsert) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) onInsert(payload.new);
      }
    )
    .subscribe();

  // Return unsubscribe function for cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Human-readable status label */
function formatStatus(status) {
  const map = {
    pending:     'Pending',
    in_progress: 'In Progress',
    done:        'Done',
    completed:   'Completed',
    blocked:     'Blocked',
    review:      'Under Review',
  };
  return map[status] || status;
}

/** Relative time label — "2 min ago", "Yesterday" etc. */
export function timeAgo(dateString) {
  const now  = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000); // seconds

  if (diff < 60)             return 'Just now';
  if (diff < 3600)           return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)          return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2)      return 'Yesterday';
  if (diff < 86400 * 7)      return `${Math.floor(diff / 86400)}d ago`;

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
