'use strict';

const { FunderDeliverable, PartnerCommitment } = require('../../models');
const { sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

async function findByPartnerId(partnerId) {
  return FunderDeliverable.findAll({
    where: { partner_id: partnerId, removed: false },
    include: [{ model: PartnerCommitment, as: 'commitment', attributes: ['id', 'cycle_label', 'status'] }],
    order: [['due_date', 'ASC']],
  });
}

async function findByCommitmentId(commitmentId) {
  return FunderDeliverable.findAll({
    where: { commitment_id: commitmentId, removed: false },
    order: [['due_date', 'ASC']],
  });
}

async function create(data) {
  return FunderDeliverable.create({
    partner_id: data.partner_id,
    commitment_id: data.commitment_id,
    deliverable_type: data.deliverable_type,
    description: data.description,
    due_date: data.due_date,
    status: data.status || 'pending',
    notes: data.notes || null,
  });
}

async function update(id, data) {
  const record = await FunderDeliverable.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Deliverable not found');
    err.statusCode = 404;
    throw err;
  }
  const allowed = [
    'deliverable_type', 'description', 'due_date', 'delivered_date',
    'status', 'document_url', 'notes',
  ];
  const patch = {};
  allowed.forEach((k) => { if (k in data) patch[k] = data[k]; });
  await record.update(patch);
  return record;
}

async function softDelete(id) {
  const record = await FunderDeliverable.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Deliverable not found');
    err.statusCode = 404;
    throw err;
  }
  await record.update({ removed: true });
  return record;
}

async function getOverdueDeliverables(partnerIds) {
  if (Array.isArray(partnerIds) && partnerIds.length === 0) return 0;
  // Mark overdue first
  await sequelize.query(
    `UPDATE mad_crm_dev.funder_deliverables
     SET status = 'overdue', "updatedAt" = NOW()
     WHERE status NOT IN ('accepted', 'overdue')
       AND due_date < CURRENT_DATE
       AND removed = false
       AND partner_id IN (:partnerIds)`,
    { replacements: { partnerIds }, type: QueryTypes.UPDATE }
  );
  const rows = await sequelize.query(
    `SELECT id FROM mad_crm_dev.funder_deliverables
     WHERE status = 'overdue' AND removed = false AND partner_id IN (:partnerIds)`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  return rows.length;
}

async function getDueThisMonth(partnerIds) {
  // partnerIds === null means admin (no restriction); empty array means no scope
  if (Array.isArray(partnerIds) && partnerIds.length === 0) {
    return { overdue: [], due_soon: [] };
  }

  const scopeClause = partnerIds === null ? '' : `AND fd.partner_id IN (${partnerIds.join(',')})`;

  const overdue = await sequelize.query(
    `SELECT fd.id, fd.partner_id, fd.commitment_id, fd.deliverable_type,
            fd.description, fd.due_date, fd.status,
            p.partner_name AS funder_name
     FROM mad_crm_dev.funder_deliverables fd
     INNER JOIN mad_crm_dev.partners p ON p.id = fd.partner_id
     WHERE fd.status = 'overdue'
       AND fd.removed = false
       ${scopeClause}
     ORDER BY fd.due_date ASC`,
    { type: QueryTypes.SELECT }
  );

  const due_soon = await sequelize.query(
    `SELECT fd.id, fd.partner_id, fd.commitment_id, fd.deliverable_type,
            fd.description, fd.due_date, fd.status,
            p.partner_name AS funder_name
     FROM mad_crm_dev.funder_deliverables fd
     INNER JOIN mad_crm_dev.partners p ON p.id = fd.partner_id
     WHERE fd.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
       AND fd.status IN ('pending', 'submitted')
       AND fd.removed = false
       ${scopeClause}
     ORDER BY fd.due_date ASC`,
    { type: QueryTypes.SELECT }
  );

  return { overdue, due_soon };
}

module.exports = {
  findByPartnerId,
  findByCommitmentId,
  create,
  update,
  softDelete,
  getOverdueDeliverables,
  getDueThisMonth,
};
