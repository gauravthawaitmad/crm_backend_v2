/**
 * agreement.repository.js
 *
 * Data-access layer for the `partner_agreements` table.
 * Append-only by design — each stage transition inserts a new row.
 */

const { PartnerAgreement } = require('../../models');

/**
 * Get the most recent PartnerAgreement for a partner.
 * @param {number} partnerId
 * @returns {PartnerAgreement|null}
 */
async function getLatest(partnerId) {
  return PartnerAgreement.findOne({
    where: { partner_id: partnerId, removed: false },
    order: [['id', 'DESC']],
  });
}

/**
 * Get all PartnerAgreements for a partner (full tracking history).
 * Ordered newest first.
 * @param {number} partnerId
 * @returns {PartnerAgreement[]}
 */
async function getAll(partnerId) {
  return PartnerAgreement.findAll({
    where: { partner_id: partnerId, removed: false },
    order: [['id', 'DESC']],
  });
}

/**
 * Create a new PartnerAgreement row (append-only stage record).
 * @param {object} data - Fields to insert
 * @param {object} [transaction] - Sequelize transaction
 * @returns {PartnerAgreement}
 */
async function create(data, transaction) {
  return PartnerAgreement.create(
    { removed: false, ...data },
    transaction ? { transaction } : {}
  );
}

/**
 * Return just the conversion_stage string of the latest agreement.
 * @param {number} partnerId
 * @returns {string|null}
 */
async function getConversionStage(partnerId) {
  const agreement = await getLatest(partnerId);
  return agreement?.conversion_stage ?? null;
}

/**
 * Create a new agreement only if no agreement with the given stage
 * already exists for this partner (idempotent create).
 * @param {number} partnerId
 * @param {string} stage
 * @param {object} [extraData]
 * @param {object} [transaction]
 */
async function createIfNotExists(partnerId, stage, extraData = {}, transaction) {
  const existing = await PartnerAgreement.findOne({
    where: { partner_id: partnerId, conversion_stage: stage },
    ...(transaction ? { transaction } : {}),
  });
  if (existing) return existing;
  return create({ partner_id: partnerId, conversion_stage: stage, ...extraData }, transaction);
}

module.exports = {
  getLatest,
  getAll,
  create,
  getConversionStage,
  createIfNotExists,
};
