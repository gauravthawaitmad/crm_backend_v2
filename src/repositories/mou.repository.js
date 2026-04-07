/**
 * mou.repository.js
 *
 * Data-access layer for the `mous` table.
 * Confirmed DB columns (2026-02-28):
 *   id, partner_id, mou_sign_date, mou_start_date, mou_url, mou_status,
 *   mou_sign, pending_mou_reason, confirmed_child_count, createdAt, updatedAt,
 *   mou_end_date, removed
 */

const { Mou } = require('../../models');

/**
 * Get the active MOU for a partner (mou_status = 'active', removed = false).
 * @param {number} partnerId
 * @returns {Mou|null}
 */
async function getActive(partnerId) {
  return Mou.findOne({
    where: { partner_id: partnerId, mou_status: 'active', removed: false },
    order: [['id', 'DESC']],
  });
}

/**
 * Get all MOUs for a partner (full history, newest first).
 * @param {number} partnerId
 * @returns {Mou[]}
 */
async function getAll(partnerId) {
  return Mou.findAll({
    where: { partner_id: partnerId },
    order: [['id', 'DESC']],
  });
}

/**
 * Create a new MOU record.
 * @param {object} data
 * @param {object} [transaction]
 * @returns {Mou}
 */
async function create(data, transaction) {
  return Mou.create(data, transaction ? { transaction } : {});
}

/**
 * Deactivate (soft-remove) a specific MOU.
 * Sets removed = true and mou_status = 'inactive'.
 * @param {number} mouId
 * @param {object} [transaction]
 */
async function deactivate(mouId, transaction) {
  await Mou.update(
    { removed: true, mou_status: 'inactive' },
    { where: { id: mouId }, ...(transaction ? { transaction } : {}) }
  );
}

module.exports = { getActive, getAll, create, deactivate };
