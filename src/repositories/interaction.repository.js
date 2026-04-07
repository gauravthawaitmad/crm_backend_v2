'use strict';

/**
 * interaction.repository.js
 *
 * Data-access layer for the `interactions` table.
 * No business logic — pure query construction.
 */

const { Interaction, sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get all interactions for a partner, newest first.
 * Joins poc name and conductor display name.
 *
 * @param {number} partnerId
 * @param {object} options - { limit, offset, outcome }
 */
async function findByPartnerId(partnerId, options = {}) {
  const { limit = 50, offset = 0, outcome } = options;

  let outcomeFilter = '';
  const replacements = { partnerId, limit, offset };

  if (outcome) {
    outcomeFilter = 'AND i.outcome = :outcome';
    replacements.outcome = outcome;
  }

  return sequelize.query(
    `SELECT
       i.*,
       p.poc_name,
       p.poc_designation,
       u.user_display_name AS conducted_by_name
     FROM interactions i
     LEFT JOIN pocs p ON p.id = i.poc_id AND p.removed = false
     LEFT JOIN user_data u ON u.user_id::TEXT = i.conducted_by
     WHERE i.partner_id = :partnerId
       AND i.removed = false
       ${outcomeFilter}
     ORDER BY i.interaction_date DESC, i.id DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert a new interaction row.
 *
 * @param {object} data
 * @param {object} [transaction]
 */
async function create(data, transaction) {
  return Interaction.create(data, transaction ? { transaction } : {});
}

/**
 * Update editable fields on an interaction.
 * Only the conductor (conducted_by) may update.
 * Cannot change interaction_type or interaction_date after logging.
 *
 * @param {number} id
 * @param {string} conductedBy - user_id of requester (must match conducted_by)
 * @param {object} data        - { summary, outcome, next_steps, follow_up_date, follow_up_assigned_to }
 */
async function update(id, conductedBy, data) {
  const interaction = await Interaction.findOne({
    where: { id, conducted_by: String(conductedBy), removed: false },
  });

  if (!interaction) {
    const err = new Error('Interaction not found or not authorized');
    err.statusCode = 403;
    throw err;
  }

  const allowed = ['summary', 'outcome', 'next_steps', 'follow_up_date', 'follow_up_assigned_to'];
  const patch = {};
  allowed.forEach((k) => { if (k in data) patch[k] = data[k]; });

  await interaction.update(patch);
  return interaction;
}

/**
 * Mark a follow-up as done.
 * Caller must be the conductor OR the assigned follow-up owner.
 *
 * @param {number} id
 * @param {string} userId
 */
async function markFollowUpDone(id, userId) {
  const interaction = await Interaction.findOne({ where: { id, removed: false } });

  if (!interaction) {
    const err = new Error('Interaction not found');
    err.statusCode = 404;
    throw err;
  }

  if (
    String(interaction.conducted_by) !== String(userId) &&
    String(interaction.follow_up_assigned_to) !== String(userId)
  ) {
    const err = new Error('Not authorized to mark this follow-up done');
    err.statusCode = 403;
    throw err;
  }

  await interaction.update({ follow_up_done: true, follow_up_done_at: new Date() });
  return interaction;
}

/**
 * Get pending follow-ups assigned to a user, scoped to visible partner IDs.
 * Returns rows grouped into overdue / today / this_week buckets.
 *
 * @param {string} userId
 * @param {number[]|null} partnerIds - null = all partners (admin/super_admin)
 */
async function getFollowUpsDue(userId, partnerIds) {
  if (Array.isArray(partnerIds) && partnerIds.length === 0) {
    return { overdue: [], today: [], this_week: [], total_count: 0 };
  }

  const scopeFilter =
    partnerIds === null
      ? ''
      : `AND i.partner_id IN (${partnerIds.join(',')})`;

  const rows = await sequelize.query(
    `SELECT
       i.id            AS interaction_id,
       i.partner_id,
       pt.partner_name,
       pt.entity_type,
       i.follow_up_date::text                                   AS follow_up_date,
       LEFT(COALESCE(i.next_steps, ''), 100)                    AS next_steps,
       GREATEST(0, (CURRENT_DATE - i.follow_up_date)::int)      AS days_overdue,
       CASE
         WHEN i.follow_up_date < CURRENT_DATE                           THEN 'overdue'
         WHEN i.follow_up_date = CURRENT_DATE                           THEN 'today'
         WHEN i.follow_up_date <= CURRENT_DATE + INTERVAL '7 days'     THEN 'this_week'
         ELSE 'future'
       END AS bucket
     FROM interactions i
     INNER JOIN partners pt ON pt.id = i.partner_id AND pt.removed = false
     WHERE i.follow_up_done = false
       AND i.follow_up_date IS NOT NULL
       AND i.removed = false
       AND i.follow_up_assigned_to = :userId
       ${scopeFilter}
     ORDER BY i.follow_up_date ASC`,
    { replacements: { userId: String(userId) }, type: QueryTypes.SELECT }
  );

  const overdue   = rows.filter((r) => r.bucket === 'overdue');
  const today     = rows.filter((r) => r.bucket === 'today');
  const this_week = rows.filter((r) => r.bucket === 'this_week');

  return {
    overdue:     overdue.map((r) => ({ ...r, days_overdue: parseInt(r.days_overdue, 10) })),
    today,
    this_week,
    total_count: rows.length,
  };
}

/**
 * Soft-delete an interaction. Only the original conductor may delete.
 *
 * @param {number} id
 * @param {string} conductedBy
 */
async function softDelete(id, conductedBy) {
  const interaction = await Interaction.findOne({
    where: { id, conducted_by: String(conductedBy), removed: false },
  });

  if (!interaction) {
    const err = new Error('Interaction not found or not authorized');
    err.statusCode = 403;
    throw err;
  }

  await interaction.update({ removed: true });
  return interaction;
}

module.exports = {
  findByPartnerId,
  create,
  update,
  markFollowUpDone,
  getFollowUpsDue,
  softDelete,
};
