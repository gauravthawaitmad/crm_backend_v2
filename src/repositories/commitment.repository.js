'use strict';

const { PartnerCommitment } = require('../../models');

async function findByPartnerId(partnerId) {
  return PartnerCommitment.findAll({
    where: { partner_id: partnerId, removed: false },
    order: [['createdAt', 'DESC']],
  });
}

async function create(data) {
  return PartnerCommitment.create(data);
}

async function update(id, data) {
  const record = await PartnerCommitment.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Commitment not found');
    err.statusCode = 404;
    throw err;
  }
  const allowed = [
    'cycle_label', 'committed_count', 'delivered_count', 'actual_count',
    'start_date', 'end_date', 'commitment_notes', 'status', 'document_url',
  ];
  const patch = {};
  allowed.forEach((k) => { if (k in data) patch[k] = data[k]; });
  await record.update(patch);
  return record;
}

async function softDelete(id) {
  const record = await PartnerCommitment.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Commitment not found');
    err.statusCode = 404;
    throw err;
  }
  await record.update({ removed: true });
  return record;
}

module.exports = { findByPartnerId, create, update, softDelete };
