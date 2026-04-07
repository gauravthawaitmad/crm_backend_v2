'use strict';

/**
 * poc.repository.js
 *
 * Data-access layer for `pocs`, `poc_partners`, and related queries.
 * No business logic — pure query construction.
 */

const { Poc, PocPartner, Meeting, User, sequelize } = require('../../models');
const { Op, QueryTypes } = require('sequelize');

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Get all active POCs for a partner, each with their meetings.
 */
async function findByPartnerId(partnerId) {
  const rows = await sequelize.query(
    `SELECT p.id
     FROM pocs p
     INNER JOIN poc_partners pp ON pp.poc_id = p.id AND pp.partner_id = :partnerId
     WHERE p.removed = false
     ORDER BY p.id ASC`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );

  if (!rows.length) return [];

  const pocIds = rows.map((r) => r.id);

  return Poc.findAll({
    where: { id: { [Op.in]: pocIds }, removed: false },
    include: [
      {
        model: Meeting,
        as: 'meetings',
        order: [['meeting_date', 'DESC']],
        required: false,
      },
    ],
    order: [['id', 'ASC']],
  });
}

/**
 * Get a single POC by ID with meetings.
 */
async function findById(id) {
  return Poc.findOne({
    where: { id, removed: false },
    include: [
      {
        model: Meeting,
        as: 'meetings',
        order: [['meeting_date', 'DESC']],
        required: false,
      },
    ],
  });
}

/**
 * Check if a POC with the same contact number already exists for this partner.
 * Returns the existing POC or null.
 */
async function checkDuplicate(partnerId, pocContact, excludeId = null) {
  const where = { poc_contact: String(pocContact), removed: false };
  if (excludeId) where.id = { [Op.ne]: excludeId };

  const poc = await Poc.findOne({ where });
  if (!poc) return null;

  // Check if this POC is linked to the given partner
  const link = await PocPartner.findOne({ where: { poc_id: poc.id, partner_id: partnerId } });
  return link ? poc : null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Create a new Poc record only (no PocPartner or Meeting — handled in service).
 */
async function create(data, transaction) {
  return Poc.create(data, transaction ? { transaction } : {});
}

/**
 * Create the PocPartner junction record.
 */
async function createPocPartner(pocId, partnerId, transaction) {
  return PocPartner.create({ poc_id: pocId, partner_id: partnerId }, transaction ? { transaction } : {});
}

/**
 * Update a POC's fields.
 */
async function update(id, data, transaction) {
  await Poc.update(data, { where: { id }, ...(transaction ? { transaction } : {}) });
  return Poc.findByPk(id);
}

/**
 * Soft delete a POC.
 */
async function softDelete(id, transaction) {
  return Poc.update({ removed: true }, { where: { id }, ...(transaction ? { transaction } : {}) });
}

module.exports = {
  findByPartnerId,
  findById,
  checkDuplicate,
  create,
  createPocPartner,
  update,
  softDelete,
};
