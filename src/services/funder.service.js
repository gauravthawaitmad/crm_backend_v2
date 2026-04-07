'use strict';

const { sequelize, PartnerCo, FunderPartnerDetail, PartnerCommitment } = require('../../models');
const funderRepo = require('../repositories/funder.repository');
const partnerRepo = require('../repositories/partner.repository');
const agreementRepo = require('../repositories/agreement.repository');
const commitmentRepo = require('../repositories/commitment.repository');
const deliverableRepo = require('../repositories/deliverable.repository');
const partnerSvc = require('./partner.service');
const STAGE_CONFIGS = require('../config/stage-configs');

// ── List ──────────────────────────────────────────────────────────────────────

async function getFunderList(userId, userRole, params) {
  return funderRepo.findAll({ ...params, userId, userRole });
}

// ── Detail ────────────────────────────────────────────────────────────────────

async function getFunderById(id) {
  const funder = await funderRepo.findById(id);
  if (!funder) return null;

  // Fetch deliverables and attach to commitments
  const deliverables = await deliverableRepo.findByPartnerId(id);
  const deliverableMap = new Map();
  deliverables.forEach((d) => {
    const raw = d.toJSON ? d.toJSON() : d;
    const key = raw.commitment_id;
    if (!deliverableMap.has(key)) deliverableMap.set(key, []);
    deliverableMap.get(key).push(raw);
  });

  // Check renewal flags — any commitment ending within 30 days
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enrichedCommitments = (funder.commitments || []).map((c) => {
    const endDate = c.end_date ? new Date(c.end_date) : null;
    const renewal_flag = endDate && endDate <= thirtyDaysFromNow && c.status !== 'completed';
    return {
      ...c,
      renewal_flag,
      deliverables: deliverableMap.get(c.id) || [],
    };
  });

  return { ...funder, commitments: enrichedCommitments };
}

// ── Create ────────────────────────────────────────────────────────────────────

async function createFunder(data, userId) {
  const { name, funder_type, state_id, city_id, co_id, website } = data;

  if (!name) throw Object.assign(new Error('Funder name is required'), { statusCode: 400 });
  if (!funder_type) throw Object.assign(new Error('Funder type is required'), { statusCode: 400 });
  if (!state_id) throw Object.assign(new Error('State is required'), { statusCode: 400 });
  if (!city_id) throw Object.assign(new Error('City is required'), { statusCode: 400 });
  if (!co_id) throw Object.assign(new Error('CO assignment is required'), { statusCode: 400 });

  const t = await sequelize.transaction();
  try {
    const partner = await funderRepo.create(data, userId, t);

    await FunderPartnerDetail.create({
      partner_id: partner.id,
      funder_type: funder_type || null,
      website: website || null,
    }, { transaction: t });

    await PartnerCo.create({
      partner_id: partner.id,
      co_id: parseInt(co_id),
      is_active: true,
      assigned_by: String(userId),
    }, { transaction: t });

    await agreementRepo.create({
      partner_id: partner.id,
      conversion_stage: 'prospect',
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

async function updateFunderDetails(id, data) {
  const partner = await partnerRepo.findById(id, 'funder');
  if (!partner) {
    throw Object.assign(new Error('Funder not found'), { statusCode: 404 });
  }
  await funderRepo.updateDetails(id, data);
  return getFunderById(id);
}

// ── Stage Update ──────────────────────────────────────────────────────────────

async function updateStage(partnerId, newStage, data, userId) {
  const config = STAGE_CONFIGS.funder;
  if (!config.stages.includes(newStage)) {
    throw Object.assign(new Error(`Invalid stage: ${newStage}`), { statusCode: 400 });
  }
  return partnerSvc.updateStage(partnerId, newStage, data, userId, 'funder');
}

// ── Commitments ───────────────────────────────────────────────────────────────

async function addCommitment(partnerId, data, userId) {
  const partner = await partnerRepo.findById(partnerId, 'funder');
  if (!partner) {
    throw Object.assign(new Error('Funder not found'), { statusCode: 404 });
  }

  return commitmentRepo.create({
    partner_id: parseInt(partnerId),
    entity_type: 'funder',
    cycle_label: data.cycle_label,
    commitment_type: data.commitment_type,
    amount_description: data.amount_description,
    amount: data.amount || null,
    amount_per_installment: data.amount_per_installment || null,
    installment_frequency: data.installment_frequency || null,
    total_installments: data.total_installments || null,
    received_installments: 0,
    program_name: data.program_name || null,
    start_date: data.start_date,
    end_date: data.end_date,
    commitment_notes: data.commitment_notes || null,
    status: data.status || 'pending',
  });
}

async function listCommitments(partnerId) {
  return commitmentRepo.findByPartnerId(partnerId);
}

async function updateCommitment(partnerId, commitmentId, data) {
  const partner = await partnerRepo.findById(partnerId, 'funder');
  if (!partner) {
    throw Object.assign(new Error('Funder not found'), { statusCode: 404 });
  }
  return commitmentRepo.update(parseInt(commitmentId), data);
}

// ── Deliverables ──────────────────────────────────────────────────────────────

async function addDeliverable(partnerId, commitmentId, data) {
  // Verify commitment belongs to partner
  const commitment = await PartnerCommitment.findOne({
    where: { id: commitmentId, partner_id: partnerId, removed: false },
  });
  if (!commitment) {
    throw Object.assign(new Error('Commitment not found for this funder'), { statusCode: 404 });
  }
  return deliverableRepo.create({
    partner_id: parseInt(partnerId),
    commitment_id: parseInt(commitmentId),
    deliverable_type: data.deliverable_type,
    description: data.description,
    due_date: data.due_date,
    notes: data.notes || null,
  });
}

async function updateDeliverable(deliverableId, data) {
  return deliverableRepo.update(parseInt(deliverableId), data);
}

async function deleteDeliverable(deliverableId) {
  return deliverableRepo.softDelete(parseInt(deliverableId));
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteFunder(id, userRole) {
  if (!['admin', 'super_admin'].includes(userRole)) {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }
  const partner = await partnerRepo.findById(id, 'funder');
  if (!partner) {
    throw Object.assign(new Error('Funder not found'), { statusCode: 404 });
  }
  await funderRepo.softDelete(id);
}

module.exports = {
  getFunderList,
  getFunderById,
  createFunder,
  updateFunderDetails,
  updateStage,
  addCommitment,
  listCommitments,
  updateCommitment,
  addDeliverable,
  updateDeliverable,
  deleteDeliverable,
  deleteFunder,
};
