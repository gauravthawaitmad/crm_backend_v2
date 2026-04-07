'use strict';

/**
 * partner.service.js
 *
 * Generic base service for all partnership types.
 * Handles shared operations: detail fetch, stage transitions, CO reallocation, reactivation.
 * Type-specific services (sourcing, funder, vendor) will call these methods.
 *
 * NOTE: Existing school services (lead.service, organization.service) have their own
 * stage transition logic and are NOT changed. This base service is for new types.
 */

const { PartnerCo, Interaction, sequelize } = require('../../models');
const { QueryTypes }    = require('sequelize');
const partnerRepo       = require('../repositories/partner.repository');
const agreementRepo     = require('../repositories/agreement.repository');
const notificationSvc   = require('./notification.service');
const interactionRepo   = require('../repositories/interaction.repository');
const STAGE_CONFIGS     = require('../config/stage-configs');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Get the user_id of the currently active CO for a partner.
 * Returns null if none assigned.
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
 * Get a partner by ID, verified against expected entity type.
 *
 * @param {number} id
 * @param {string} entityType - 'school' | 'sourcing' | 'funder' | 'vendor'
 */
async function getPartnerById(id, entityType) {
  const partner = await partnerRepo.findById(id);
  if (!partner) return null;
  if (entityType && partner.entity_type !== entityType) return null;
  return partner;
}

/**
 * Transition a partner to a new stage.
 * Validates stage against the entity type's allowed stages.
 * Creates a PartnerAgreement row (append-only).
 * Notifies the assigned CO if they're not the one making the change.
 *
 * @param {number} partnerId
 * @param {string} newStage
 * @param {object} data       - extra stage-specific fields (non_conversion_reason, etc.)
 * @param {string} userId     - user making the change
 * @param {string} entityType
 */
async function updateStage(partnerId, newStage, data, userId, entityType) {
  const config = STAGE_CONFIGS[entityType];
  if (!config) {
    const err = new Error(`Unknown entity type: ${entityType}`);
    err.statusCode = 400;
    throw err;
  }

  if (!config.stages.includes(newStage)) {
    const err = new Error(`Stage '${newStage}' is not valid for entity type '${entityType}'`);
    err.statusCode = 400;
    throw err;
  }

  const partner = await partnerRepo.findById(partnerId);
  if (!partner || partner.entity_type !== entityType) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const agreement = await agreementRepo.create(
      {
        partner_id:             partnerId,
        conversion_stage:       newStage,
        changed_by:             String(userId),
        extra_data:             data.extra_data || {},
        specific_doc_required:  data.specific_doc_required || null,
        specific_doc_name:      data.specific_doc_name || null,
        non_conversion_reason:  data.non_conversion_reason || null,
        current_status:         data.current_status || null,
        expected_conversion_day: data.expected_conversion_day || null,
        agreement_drop_date:    data.agreement_drop_date || null,
      },
      t
    );

    await t.commit();

    // Notify the assigned CO if someone else made the change
    const activeCo = await _getActiveCo(partnerId);
    if (activeCo && String(activeCo) !== String(userId)) {
      const stageLabel = newStage.replace(/_/g, ' ');
      await notificationSvc.createNotification(
        activeCo,
        'stage_change',
        partnerId,
        `${partner.partner_name} moved to ${stageLabel}`
      );
    }

    return agreement;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Reactivate a dropped/terminal partner by resetting to the initial stage.
 * Only valid from a terminal stage.
 *
 * @param {number} partnerId
 * @param {string} userId
 */
async function reactivate(partnerId, userId) {
  const partner = await partnerRepo.findById(partnerId);
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const config = STAGE_CONFIGS[partner.entity_type];
  if (!config) {
    const err = new Error(`No stage config for entity type: ${partner.entity_type}`);
    err.statusCode = 400;
    throw err;
  }

  const currentStage = await agreementRepo.getConversionStage(partnerId);
  if (!config.terminalStages.includes(currentStage)) {
    const err = new Error(`Partner is not in a terminal stage (current: ${currentStage})`);
    err.statusCode = 400;
    throw err;
  }

  const agreement = await agreementRepo.create({
    partner_id:       partnerId,
    conversion_stage: config.initialStage,
    changed_by:       String(userId),
    extra_data:       { reactivated: true, previous_stage: currentStage },
  });

  return agreement;
}

/**
 * Reallocate a partner to a new CO.
 * Deactivates the current CO assignment, creates a new one, logs an interaction.
 *
 * @param {number} partnerId
 * @param {number|string} newCoId
 * @param {string} userId - user performing the reallocation
 */
async function reallocateCo(partnerId, newCoId, userId) {
  const partner = await partnerRepo.findById(partnerId);
  if (!partner) {
    const err = new Error('Partner not found');
    err.statusCode = 404;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    // Deactivate current active CO assignments
    await PartnerCo.update(
      { is_active: false, removed_at: new Date() },
      { where: { partner_id: partnerId, is_active: true }, transaction: t }
    );

    // Create new active CO assignment
    await PartnerCo.create(
      {
        partner_id:  partnerId,
        co_id:       parseInt(newCoId),
        is_active:   true,
        assigned_by: String(userId),
      },
      { transaction: t }
    );

    await t.commit();

    // Log a reallocation interaction (no poc required — poc_id is nullable)
    await interactionRepo.create({
      partner_id:       partnerId,
      poc_id:           null,
      interaction_type: 'Internal',
      interaction_date: new Date().toISOString().split('T')[0],
      conducted_by:     String(userId),
      summary:          'Partner reallocated to new CO',
      outcome:          'Neutral',
      follow_up_done:   false,
      removed:          false,
    });

    return partner;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  getPartnerById,
  updateStage,
  reactivate,
  reallocateCo,
};
