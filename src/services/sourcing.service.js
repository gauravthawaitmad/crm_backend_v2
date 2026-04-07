'use strict';

const { sequelize, PartnerCo, SourcingPartnerDetail } = require('../../models');
const partnerRepo = require('../repositories/partner.repository');
const sourcingRepo = require('../repositories/sourcing.repository');
const agreementRepo = require('../repositories/agreement.repository');
const commitmentRepo = require('../repositories/commitment.repository');
const schoolTagRepo = require('../repositories/school-tag.repository');
const partnerSvc = require('./partner.service');
const STAGE_CONFIGS = require('../config/stage-configs');

// ── List ──────────────────────────────────────────────────────────────────────

async function getSourcingList(userId, userRole, params) {
  return sourcingRepo.findAll({ ...params, userId, userRole });
}

// ── Detail ────────────────────────────────────────────────────────────────────

async function getSourcingById(id) {
  return sourcingRepo.findById(id);
}

// ── Create ────────────────────────────────────────────────────────────────────

async function createSourcing(data, userId) {
  const {
    name, organization_type, state_id, city_id, co_id,
    address_line_1, pincode, lead_source,
  } = data;

  const t = await sequelize.transaction();
  try {
    // 1. Create partner
    const partner = await partnerRepo.create({
      partner_name: name,
      entity_type: 'sourcing',
      state_id: state_id || null,
      city_id: city_id || null,
      address_line_1: address_line_1 || '',
      pincode: pincode || 0,
      lead_source: lead_source || 'direct',
      created_by: parseInt(userId),
      removed: false,
    }, t);

    // 2. Create sourcing detail
    await SourcingPartnerDetail.create({
      partner_id: partner.id,
      organization_type: organization_type || null,
      volunteers_committed: 0,
      volunteers_deployed: 0,
    }, { transaction: t });

    // 3. Assign CO
    if (co_id) {
      await PartnerCo.create({
        partner_id: partner.id,
        co_id: parseInt(co_id),
        is_active: true,
        assigned_by: String(userId),
      }, { transaction: t });
    }

    // 4. Initial stage
    await agreementRepo.create({
      partner_id: partner.id,
      conversion_stage: 'identified',
      changed_by: String(userId),
      extra_data: {},
    }, t);

    await t.commit();
    return partner;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ── Update Details ────────────────────────────────────────────────────────────

async function updateSourcingDetails(id, data, userId) {
  const partner = await partnerRepo.findById(id, 'sourcing');
  if (!partner) {
    const err = new Error('Sourcing partner not found');
    err.statusCode = 404;
    throw err;
  }

  // Update sourcing_partner_details fields
  await sourcingRepo.updateDetail(id, data);

  // Also update base partners table if name/location fields are provided
  const baseFields = {};
  if (data.name) baseFields.partner_name = data.name;
  if (data.state_id != null) baseFields.state_id = data.state_id;
  if (data.city_id != null) baseFields.city_id = data.city_id;
  if (Object.keys(baseFields).length) {
    await partnerRepo.update(id, baseFields);
  }

  return getSourcingById(id);
}

async function updateCommitment(partnerId, commitmentId, data) {
  const partner = await partnerRepo.findById(partnerId, 'sourcing');
  if (!partner) {
    const err = new Error('Sourcing partner not found');
    err.statusCode = 404;
    throw err;
  }
  return commitmentRepo.update(parseInt(commitmentId), data);
}

// ── Stage Update ──────────────────────────────────────────────────────────────

async function updateStage(partnerId, newStage, data, userId) {
  const config = STAGE_CONFIGS.sourcing;
  if (!config.stages.includes(newStage)) {
    const err = new Error(`'${newStage}' is not a valid sourcing stage`);
    err.statusCode = 400;
    throw err;
  }
  return partnerSvc.updateStage(parseInt(partnerId), newStage, data, userId, 'sourcing');
}

// ── Commitments ───────────────────────────────────────────────────────────────

async function addCommitment(partnerId, data, userId) {
  const partner = await partnerRepo.findById(partnerId, 'sourcing');
  if (!partner) {
    const err = new Error('Sourcing partner not found');
    err.statusCode = 404;
    throw err;
  }

  const commitment = await commitmentRepo.create({
    partner_id: parseInt(partnerId),
    entity_type: 'sourcing',
    cycle_label: data.cycle_label,
    committed_count: data.committed_count || null,
    delivered_count: data.delivered_count || 0,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    commitment_notes: data.commitment_notes || null,
    status: data.status || 'active',
    removed: false,
  });

  // Update volunteers_committed on the detail row
  if (data.committed_count) {
    await sourcingRepo.updateDetail(partnerId, {
      volunteers_committed: data.committed_count,
    });
  }

  return commitment;
}

async function listCommitments(partnerId) {
  return commitmentRepo.findByPartnerId(parseInt(partnerId));
}

// ── School Tags ───────────────────────────────────────────────────────────────

async function tagSchool(partnerId, schoolId, userId) {
  return schoolTagRepo.addTag(parseInt(partnerId), parseInt(schoolId), userId);
}

async function removeSchoolTag(partnerId, schoolId) {
  return schoolTagRepo.removeTag(parseInt(partnerId), parseInt(schoolId));
}

async function getTaggedSchools(partnerId) {
  return schoolTagRepo.findByPartnerId(parseInt(partnerId));
}

async function getAvailableSchools(search) {
  return schoolTagRepo.getAvailableSchools(search);
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteSourcing(id, userRole) {
  if (!['admin', 'super_admin'].includes(userRole)) {
    const err = new Error('Only admin or super_admin can delete partners');
    err.statusCode = 403;
    throw err;
  }
  await partnerRepo.softDelete(id);
}

module.exports = {
  getSourcingList,
  getSourcingById,
  createSourcing,
  updateSourcingDetails,
  updateStage,
  addCommitment,
  listCommitments,
  tagSchool,
  removeSchoolTag,
  getTaggedSchools,
  getAvailableSchools,
  updateCommitment,
  deleteSourcing,
};
