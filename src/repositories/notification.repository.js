'use strict';

/**
 * notification.repository.js
 *
 * Data-access layer for the `notifications` table.
 */

const { Notification, sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Create a new notification.
 * @param {{ user_id, type, partner_id, message }} data
 */
async function create(data) {
  return Notification.create({ read: false, ...data });
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetch notifications for a user, newest first.
 * Joins partner name + entity_type when partner_id is set.
 *
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} options
 */
async function findByUser(userId, options = {}) {
  const { unreadOnly = false, limit = 20 } = options;

  const readFilter = unreadOnly ? 'AND n.read = false' : '';

  return sequelize.query(
    `SELECT
       n.*,
       pt.partner_name,
       pt.entity_type
     FROM notifications n
     LEFT JOIN partners pt ON pt.id = n.partner_id AND pt.removed = false
     WHERE n.user_id = :userId
       ${readFilter}
     ORDER BY n."createdAt" DESC
     LIMIT :limit`,
    { replacements: { userId: String(userId), limit }, type: QueryTypes.SELECT }
  );
}

/**
 * Mark a single notification as read.
 * Only the owner may mark it read.
 *
 * @param {number} id
 * @param {string} userId
 */
async function markRead(id, userId) {
  const [count] = await Notification.update(
    { read: true, read_at: new Date() },
    { where: { id, user_id: String(userId), read: false } }
  );
  return count > 0;
}

/**
 * Mark all unread notifications for a user as read.
 *
 * @param {string} userId
 */
async function markAllRead(userId) {
  const [count] = await Notification.update(
    { read: true, read_at: new Date() },
    { where: { user_id: String(userId), read: false } }
  );
  return count;
}

/**
 * Count unread notifications for a user.
 *
 * @param {string} userId
 */
async function getUnreadCount(userId) {
  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = :userId AND read = false`,
    { replacements: { userId: String(userId) }, type: QueryTypes.SELECT }
  );
  return parseInt(row.cnt, 10);
}

module.exports = {
  create,
  findByUser,
  markRead,
  markAllRead,
  getUnreadCount,
};
