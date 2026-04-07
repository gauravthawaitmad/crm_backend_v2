/**
 * organization.service.js
 *
 * Business logic for the Organization module.
 * An "Organization" is a Partner where the latest PartnerAgreement = 'converted'.
 *
 * Operations: list, detail, renew MOU, reallocate CO, soft-delete.
 */

const { sequelize, PartnerCo, Meeting, PocPartner, Poc } = require('../../models');
const { QueryTypes } = require('sequelize');
const orgRepo = require('../repositories/organization.repository');
const mouRepo = require('../repositories/mou.repository');
const agreementRepo = require('../repositories/agreement.repository');
const s3Service = require('./s3.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Find the latest active POC for a partner (used for reallocation Meeting).
 * Returns null if no POC exists (Meeting creation will be skipped).
 */
async function _getLatestPocId(partnerId) {
  const rows = await sequelize.query(
    `SELECT pp.poc_id
     FROM poc_partners pp
     INNER JOIN pocs p ON p.id = pp.poc_id AND p.removed = false
     WHERE pp.partner_id = :partnerId
     ORDER BY pp.id DESC
     LIMIT 1`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );
  return rows.length ? rows[0].poc_id : null;
}

// ── Public methods ─────────────────────────────────────────────────────────────

/**
 * Paginated list of organizations filtered by user role.
 */
async function getOrganizationList(userId, userRole, { page = 1, limit = 20, search } = {}) {
  const { rows, count } = await orgRepo.findAll({ page, limit, search, userId, userRole });
  return {
    organizations: rows,
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Full organization detail including MOU history.
 */
async function getOrganizationById(id) {
  const org = await orgRepo.findById(id);
  if (!org) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }

  const orgJson = org.toJSON();

  // Separate active MOU from history
  const allMous = orgJson.mous || [];
  orgJson.activeMou = allMous.find((m) => !m.removed && m.mou_status === 'active') || null;
  orgJson.mouHistory = allMous.filter((m) => m.removed || m.mou_status === 'inactive');
  delete orgJson.mous;

  // Latest CO
  const partnerCos = orgJson.partnerCos || [];
  orgJson.latestCo = partnerCos.length ? partnerCos[0] : null;

  return orgJson;
}

/**
 * Renew the MOU for an organization:
 * 1. Deactivate current active MOU
 * 2. Upload new document to S3
 * 3. Create new Mou record
 * 4. Append PartnerAgreement (conversion_stage = 'converted', current_status = 'mou_renewed')
 *
 * @param {number} partnerId
 * @param {object} mouData - { mou_sign_date, mou_start_date, mou_end_date, confirmed_child_count }
 * @param {Buffer|null} fileBuffer - multer file buffer (required for new MOU)
 * @param {string} originalName - original file name (for S3 key generation)
 * @param {string} userId
 */
async function renewMou(partnerId, mouData, fileBuffer, originalName, userId) {
  const org = await orgRepo.findById(partnerId);
  if (!org) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }

  if (!fileBuffer) {
    const err = new Error('MOU document is required for renewal');
    err.status = 400;
    throw err;
  }

  // Upload to S3 before starting DB transaction
  const mouUrl = await s3Service.uploadFile(
    fileBuffer,
    originalName || 'mou-document.pdf',
    'application/pdf',
    'mou_documents'
  );

  const t = await sequelize.transaction();
  try {
    // Deactivate current active MOU (if exists)
    const activeMou = await mouRepo.getActive(partnerId);
    if (activeMou) {
      await mouRepo.deactivate(activeMou.id, t);
    }

    // Create new MOU
    const newMou = await mouRepo.create(
      {
        partner_id: partnerId,
        mou_sign_date: mouData.mou_sign_date,
        mou_start_date: mouData.mou_start_date,
        mou_end_date: mouData.mou_end_date,
        confirmed_child_count: mouData.confirmed_child_count,
        mou_url: mouUrl,
        mou_status: 'active',
        mou_sign: true,
        removed: false,
      },
      t
    );

    // Append PartnerAgreement audit record
    await agreementRepo.create(
      {
        partner_id: partnerId,
        conversion_stage: 'converted',
        current_status: 'mou_renewed',
      },
      t
    );

    await t.commit();
    return newMou.toJSON();
  } catch (err) {
    await t.rollback();
    // S3 file was already uploaded — orphaned file is acceptable (non-critical)
    throw err;
  }
}

/**
 * Reallocate an organization to a different CO:
 * 1. Create new PartnerCo record (append-only history)
 * 2. Create Meeting record if a POC exists (for tracking)
 *
 * @param {number} partnerId
 * @param {string} newCoId
 * @param {string} userId - who initiated the reallocation
 */
async function reallocateCo(partnerId, newCoId, userId) {
  const org = await orgRepo.findById(partnerId);
  if (!org) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }

  // Check current CO
  const currentCo = await PartnerCo.findOne({
    where: { partner_id: partnerId },
    order: [['id', 'DESC']],
  });

  if (currentCo && currentCo.co_id.toString() === newCoId.toString()) {
    const err = new Error('New CO is already the assigned CO for this organization');
    err.status = 400;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    // Create new PartnerCo (append-only — old one stays for audit history)
    await PartnerCo.create({ partner_id: partnerId, co_id: parseInt(newCoId) }, { transaction: t });

    // Create Meeting for tracking if a POC exists
    const pocId = await _getLatestPocId(partnerId);
    if (pocId) {
      await Meeting.create(
        {
          partner_id: partnerId,
          user_id: parseInt(newCoId), // new CO takes ownership
          poc_id: pocId,
          meeting_date: new Date(),
        },
        { transaction: t }
      );
    }

    await t.commit();
    return await orgRepo.findById(partnerId);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Soft-delete an organization (and its active MOUs).
 * @param {number} id
 */
async function deleteOrganization(id) {
  const org = await orgRepo.findById(id);
  if (!org) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    await orgRepo.softDelete(id, t);
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  getOrganizationList,
  getOrganizationById,
  renewMou,
  reallocateCo,
  deleteOrganization,
};
