'use strict';

/**
 * notification.service.js
 *
 * Business logic for the Notification module.
 */

const notificationRepo = require('../repositories/notification.repository');

/**
 * Create a notification for a user.
 *
 * @param {string} userId
 * @param {string} type      - follow_up_due | stage_change | mou_expiry | commitment_expiry
 * @param {number|null} partnerId
 * @param {string} message
 */
async function createNotification(userId, type, partnerId, message) {
  return notificationRepo.create({ user_id: String(userId), type, partner_id: partnerId || null, message });
}

/**
 * Get all notifications for the current user with unread count.
 *
 * @param {string} userId
 */
async function getUserNotifications(userId) {
  const [notifications, unread_count] = await Promise.all([
    notificationRepo.findByUser(String(userId), { limit: 20 }),
    notificationRepo.getUnreadCount(String(userId)),
  ]);
  return { notifications, unread_count };
}

/**
 * Mark a single notification as read (owner-only).
 */
async function markRead(notificationId, userId) {
  const updated = await notificationRepo.markRead(notificationId, String(userId));
  if (!updated) {
    const err = new Error('Notification not found or already read');
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

/**
 * Mark all unread notifications for the user as read.
 */
async function markAllRead(userId) {
  return notificationRepo.markAllRead(String(userId));
}

/**
 * Get the unread notification count (lightweight — for bell icon polling).
 */
async function getUnreadCount(userId) {
  return notificationRepo.getUnreadCount(String(userId));
}

module.exports = {
  createNotification,
  getUserNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
};
