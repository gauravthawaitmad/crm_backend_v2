'use strict';

/**
 * interaction.service.js
 *
 * Business logic for logging and managing partner interactions.
 * Replaces the old Meeting-based pattern for all new entity types.
 * Existing school Meeting records were migrated to interactions in Phase A.
 */

const { Partner, Poc, PocPartner, sequelize } = require('../../models');
const { QueryTypes }    = require('sequelize');
const interactionRepo   = require('../repositories/interaction.repository');
const notificationSvc   = require('./notification.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verify that a poc_id belongs to a given partner (via poc_partners junction).
 */
async function _pocBelongsToPartner(pocId, partnerId) {
  const link = await PocPartner.findOne({ where: { poc_id: pocId, partner_id: partnerId } });
  return !!link;
}

/**
 * Find the current active CO for a partner (for notifications).
 * Returns null if no CO assigned.
 */
async function _getActiveCo(partnerId) {
  const rows = await sequelize.query(
    `SELECT co_id FROM partner_cos
     WHERE partner_id = :partnerId AND is_active = true
     ORDER BY id DESC LIMIT 1`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );
  return rows.length ? String(rows[0].co_id) : null;
}

// ── Public methods ─────────────────────────────────────────────────────────────

/**
 * Get interactions for a partner.
 *
 * @param {number} partnerId
 * @param {object} options - { limit, offset, outcome }
 */
async function getInteractions(partnerId, options = {}) {
  return interactionRepo.findByPartnerId(partnerId, options);
}

/**
 * Log a new interaction for a partner.
 *
 * @param {number} partnerId
 * @param {object} data      - interaction fields
 * @param {string} userId    - logged-in user's user_id (becomes conducted_by)
 */
async function logInteraction(partnerId, data, userId) {
  // Validate partner exists
  const partner = await Partner.findOne({ where: { id: partnerId, removed: false } });
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  // If poc_id provided, validate it belongs to this partner
  if (data.poc_id) {
    const valid = await _pocBelongsToPartner(data.poc_id, partnerId);
    if (!valid) {
      const err = new Error('POC does not belong to this partner');
      err.statusCode = 400;
      throw err;
    }
  }

  const interaction = await interactionRepo.create({
    partner_id:            partnerId,
    poc_id:                data.poc_id || null,
    interaction_type:      data.interaction_type,
    interaction_date:      data.interaction_date,
    duration_mins:         data.duration_mins || null,
    location:              data.location || null,
    conducted_by:          String(userId),
    attendees_notes:       data.attendees_notes || null,
    summary:               data.summary,
    outcome:               data.outcome,
    next_steps:            data.next_steps || null,
    follow_up_date:        data.follow_up_date || null,
    follow_up_assigned_to: data.follow_up_assigned_to || null,
    follow_up_done:        false,
    removed:               false,
  });

  // If a follow-up was scheduled, notify the assigned user
  if (data.follow_up_date && data.follow_up_assigned_to) {
    const truncatedSteps = data.next_steps
      ? data.next_steps.substring(0, 80) + (data.next_steps.length > 80 ? '...' : '')
      : '';
    const message = `Follow-up due with ${partner.partner_name} on ${data.follow_up_date}${truncatedSteps ? ': ' + truncatedSteps : ''}`;
    await notificationSvc.createNotification(
      data.follow_up_assigned_to,
      'follow_up_due',
      partnerId,
      message
    );
  }

  return interaction;
}

/**
 * Update editable fields on an interaction (author only).
 */
async function updateInteraction(id, userId, data) {
  return interactionRepo.update(id, String(userId), data);
}

/**
 * Mark a follow-up as done.
 */
async function markFollowUpDone(interactionId, userId) {
  return interactionRepo.markFollowUpDone(interactionId, String(userId));
}

/**
 * Soft-delete an interaction (author only).
 */
async function deleteInteraction(id, userId) {
  return interactionRepo.softDelete(id, String(userId));
}

module.exports = {
  getInteractions,
  logInteraction,
  updateInteraction,
  markFollowUpDone,
  deleteInteraction,
};
