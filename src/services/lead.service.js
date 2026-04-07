/**
 * lead.service.js
 *
 * All business logic for the Lead module.
 * Orchestrates repositories, handles transactions, enforces rules.
 *
 * A "Lead" is a Partner where latest PartnerAgreement.conversion_stage != 'converted'.
 */

const { sequelize, Poc, PocPartner, Meeting } = require('../../models');
const partnerRepo = require('../repositories/partner.repository');
const agreementRepo = require('../repositories/agreement.repository');
const s3Service = require('./s3.service');

// ── POC helper ────────────────────────────────────────────────────────────────

/**
 * Find-or-create a POC for a partner.
 * Checks by poc_contact to prevent duplicates.
 * Also creates PocPartner junction and a Meeting record.
 *
 * @param {number} partnerId
 * @param {object} pocData - { poc_name, poc_designation, poc_contact, poc_email, date_of_first_contact }
 * @param {string} userId  - creator's user_id
 * @param {object} t       - Sequelize transaction
 * @returns {Poc}
 */
async function _findOrCreatePoc(partnerId, pocData, userId, t) {
  // Check if a POC with this contact number already exists for this partner
  const existing = await Poc.findOne({
    where: {
      partner_id: partnerId,
      poc_contact: pocData.poc_contact,
      removed: false,
    },
    transaction: t,
  });

  if (existing) return existing;

  // Create new POC
  const poc = await Poc.create(
    {
      partner_id: partnerId,
      poc_name: pocData.poc_name,
      poc_designation: pocData.poc_designation || 'N/A',
      poc_contact: String(pocData.poc_contact),
      poc_email: pocData.poc_email || '',
      date_of_first_contact: pocData.date_of_first_contact || new Date(),
      removed: false,
    },
    { transaction: t }
  );

  // Create PocPartner junction
  await PocPartner.create(
    { poc_id: poc.id, partner_id: partnerId },
    { transaction: t }
  );

  // Auto-create Meeting record (tracks first contact date)
  await Meeting.create(
    {
      user_id: parseInt(userId),
      poc_id: poc.id,
      partner_id: partnerId,
      meeting_date: pocData.date_of_first_contact || new Date(),
    },
    { transaction: t }
  );

  return poc;
}

// ── Stage transition handlers ─────────────────────────────────────────────────

async function _handleFirstConversation(partnerId, stageData, userId, t) {
  // Create PartnerAgreement for first_conversation stage
  await agreementRepo.create(
    { partner_id: partnerId, conversion_stage: 'first_conversation' },
    t
  );

  // If POC data is provided, find-or-create POC + PocPartner + Meeting
  if (stageData.poc_name && stageData.poc_contact) {
    await _findOrCreatePoc(partnerId, stageData, userId, t);
  }
}

async function _handleInterested(partnerId, stageData, userId, t) {
  // Create PartnerAgreement for interested stage
  await agreementRepo.create(
    {
      partner_id: partnerId,
      conversion_stage: 'interested',
      specific_doc_required: stageData.specific_doc_required || false,
      specific_doc_name: stageData.specific_doc_name || null,
      potential_child_count: stageData.potential_child_count || null,
    },
    t
  );

  // Update Partner school info fields
  const schoolUpdateFields = {};
  if (stageData.partner_affiliation_type !== undefined)
    schoolUpdateFields.partner_affiliation_type = stageData.partner_affiliation_type;
  if (stageData.school_type !== undefined)
    schoolUpdateFields.school_type = stageData.school_type;
  if (stageData.total_child_count !== undefined)
    schoolUpdateFields.total_child_count = stageData.total_child_count;
  if (stageData.classes !== undefined)
    schoolUpdateFields.classes = stageData.classes;
  if (stageData.low_income_resource !== undefined)
    schoolUpdateFields.low_income_resource = stageData.low_income_resource;

  if (Object.keys(schoolUpdateFields).length) {
    await partnerRepo.update(partnerId, schoolUpdateFields, t);
  }

  // If POC data is provided
  if (stageData.poc_name && stageData.poc_contact) {
    await _findOrCreatePoc(partnerId, stageData, userId, t);
  }
}

async function _handleDelay(partnerId, stageData, t) {
  await agreementRepo.create(
    {
      partner_id: partnerId,
      conversion_stage: 'interested_but_facing_delay',
      current_status: stageData.current_status,
      expected_conversion_day: stageData.expected_conversion_day || null,
    },
    t
  );
}

async function _handleNotInterested(partnerId, stageData, t) {
  await agreementRepo.create(
    {
      partner_id: partnerId,
      conversion_stage: 'not_interested',
      non_conversion_reason: stageData.non_conversion_reason,
      agreement_drop_date: stageData.agreement_drop_date || new Date(),
    },
    t
  );
}

async function _handleDropped(partnerId, stageData, t) {
  await agreementRepo.create(
    {
      partner_id: partnerId,
      conversion_stage: 'dropped',
      non_conversion_reason: stageData.non_conversion_reason,
      agreement_drop_date: stageData.agreement_drop_date || new Date(),
    },
    t
  );
}

async function _handleConverted(partnerId, stageData, userId, fileBuffer, fileName, mimeType, t) {
  let mouUrl = null;

  // Upload MOU document to S3 (if file provided)
  if (fileBuffer) {
    try {
      mouUrl = await s3Service.uploadFile(fileBuffer, fileName, mimeType, 'mou_documents');
    } catch (uploadErr) {
      const err = new Error('MOU document upload failed: ' + uploadErr.message);
      err.status = 500;
      throw err;
    }
  }

  // Create PartnerAgreement for converted stage
  await agreementRepo.create(
    { partner_id: partnerId, conversion_stage: 'converted' },
    t
  );

  // Create Mou record
  const { Mou } = require('../../models');
  await Mou.create(
    {
      partner_id: partnerId,
      mou_sign: mouUrl ? true : false,
      mou_sign_date: stageData.mou_sign_date || null,
      mou_start_date: stageData.mou_start_date || null,
      mou_end_date: stageData.mou_end_date || null,
      mou_status: 'active',
      mou_url: mouUrl,
      confirmed_child_count: stageData.confirmed_child_count || null,
      removed: false,
    },
    { transaction: t }
  );

  return { isConverted: true, mouUrl };
}

// ── Public service methods ────────────────────────────────────────────────────

/**
 * Get paginated list of leads with role-based visibility.
 *
 * @param {string} userId
 * @param {string} userRole
 * @param {object} filters - { page, limit, search, stage }
 * @returns {{ leads: object[], total: number, page: number, totalPages: number }}
 */
async function getLeadList(userId, userRole, { page = 1, limit = 20, search, stage } = {}) {
  const { rows, count } = await partnerRepo.findAll({
    page,
    limit,
    search,
    userId,
    userRole,
  });

  // Optional client-side stage filter (filter on latestAgreement.conversion_stage)
  let filtered = rows;
  if (stage) {
    filtered = rows.filter((r) => r.latestAgreement?.conversion_stage === stage);
  }

  return {
    leads: filtered,
    total: count,
    page: Number(page),
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Get full lead detail by ID (includes tracking history).
 * @param {number} id
 * @returns {object}
 */
async function getLeadById(id) {
  const partner = await partnerRepo.findById(id);
  if (!partner) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  const p = partner.toJSON();

  // Build tracking_history from all agreements (newest first)
  p.tracking_history = (p.agreements || []).map((ag) => ({
    stage: ag.conversion_stage,
    date: ag.createdAt,
    details: {
      non_conversion_reason: ag.non_conversion_reason,
      current_status: ag.current_status,
      expected_conversion_day: ag.expected_conversion_day,
      agreement_drop_date: ag.agreement_drop_date,
      specific_doc_required: ag.specific_doc_required,
      specific_doc_name: ag.specific_doc_name,
      potential_child_count: ag.potential_child_count,
    },
  }));

  // Latest agreement as currentStage
  p.currentStage = p.agreements?.[0]?.conversion_stage || null;

  // Latest CO assignment
  p.latestCo = p.partnerCos?.[0] || null;

  // Latest POC
  const latestPocPartner = p.pocPartners?.[0];
  p.latestPoc = latestPocPartner?.poc || null;

  return p;
}

/**
 * Create a new lead (Partner + PartnerCo + PartnerAgreement).
 * Wrapped in a transaction — all or nothing.
 *
 * @param {object} data - { partner_name, state_id, city_id, address_line_1, address_line_2,
 *                         pincode, lead_source, co_id, ... }
 * @param {string|number} createdBy - user_id of the creator
 * @returns {object} created partner
 */
async function createLead(data, createdBy) {
  const { PartnerCo } = require('../../models');
  const t = await sequelize.transaction();

  try {
    const { co_id, ...partnerData } = data;

    // 1. Create Partner
    const partner = await partnerRepo.create(
      {
        ...partnerData,
        created_by: createdBy,
        removed: false,
      },
      t
    );

    // 2. Create PartnerCo (CO assignment)
    if (co_id) {
      await PartnerCo.create(
        { partner_id: partner.id, co_id: parseInt(co_id) },
        { transaction: t }
      );
    }

    // 3. Create initial PartnerAgreement (stage = 'new')
    await agreementRepo.create(
      { partner_id: partner.id, conversion_stage: 'new' },
      t
    );

    await t.commit();
    return partner.toJSON();
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Update lead stage — routes to the correct handler based on newStage.
 * Each handler runs inside a Sequelize transaction.
 *
 * @param {number} id          - partner_id
 * @param {string} newStage    - conversion_stage enum value
 * @param {object} stageData   - stage-specific fields from request body
 * @param {string} userId      - acting user's user_id
 * @param {object} [file]      - multer file object (for 'converted' stage)
 * @returns {object}
 */
async function updateLeadStage(id, newStage, stageData, userId, file) {
  // Verify the lead exists
  const existingPartner = await partnerRepo.findById(id);
  if (!existingPartner) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }

  const t = await sequelize.transaction();
  let extra = {};

  try {
    switch (newStage) {
      case 'first_conversation':
        await _handleFirstConversation(id, stageData, userId, t);
        break;

      case 'interested':
        await _handleInterested(id, stageData, userId, t);
        break;

      case 'interested_but_facing_delay':
        await _handleDelay(id, stageData, t);
        break;

      case 'not_interested':
        await _handleNotInterested(id, stageData, t);
        break;

      case 'dropped':
        await _handleDropped(id, stageData, t);
        break;

      case 'converted': {
        let fileBuffer = null;
        let fileName = null;
        let mimeType = null;
        if (file) {
          fileBuffer = file.buffer;
          fileName = file.originalname;
          mimeType = file.mimetype;
        }
        extra = await _handleConverted(id, stageData, userId, fileBuffer, fileName, mimeType, t);
        break;
      }

      default: {
        const err = new Error(`Unknown conversion stage: ${newStage}`);
        err.status = 400;
        throw err;
      }
    }

    await t.commit();

    // Return updated lead detail
    const updated = await getLeadById(id);
    return { ...updated, ...extra };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Soft-delete a lead. Converted partners cannot be deleted.
 * @param {number} id
 */
async function deleteLead(id) {
  const stage = await agreementRepo.getConversionStage(id);
  if (stage === 'converted') {
    const err = new Error('Cannot delete a converted partner');
    err.status = 400;
    throw err;
  }

  await partnerRepo.softDelete(id);
}

module.exports = {
  getLeadList,
  getLeadById,
  createLead,
  updateLeadStage,
  deleteLead,
};
