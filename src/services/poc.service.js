'use strict';

/**
 * poc.service.js
 *
 * Business logic for POC and Meeting management.
 */

const pocRepo = require('../repositories/poc.repository');
const meetingRepo = require('../repositories/meeting.repository');
const { sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');
function notFound(msg) {
  const err = new Error(msg);
  err.statusCode = 404;
  return err;
}

// ── List All (for /poc global page) ───────────────────────────────────────────

async function listAll({ page = 1, limit = 20, search } = {}) {
  const offset = (page - 1) * limit;
  const searchClause = search
    ? `AND (pocs.poc_name ILIKE :search OR pocs.poc_contact ILIKE :search OR p.partner_name ILIKE :search)`
    : '';
  const replacements = { limit: Number(limit), offset: Number(offset) };
  if (search) replacements.search = `%${search}%`;

  const rows = await sequelize.query(
    `SELECT pocs.id, pocs.poc_name, pocs.poc_designation, pocs.poc_contact, pocs.poc_email,
            pocs.date_of_first_contact, pocs."createdAt",
            p.id AS partner_id, p.partner_name
     FROM pocs
     INNER JOIN partners p ON p.id = pocs.partner_id AND p.removed = false
     WHERE pocs.removed = false ${searchClause}
     ORDER BY pocs."createdAt" DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [countRow] = await sequelize.query(
    `SELECT COUNT(*) AS cnt FROM pocs
     INNER JOIN partners p ON p.id = pocs.partner_id AND p.removed = false
     WHERE pocs.removed = false ${searchClause}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const total = parseInt(countRow?.cnt ?? 0);
  return {
    pocs: rows,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
}

// ── Read ──────────────────────────────────────────────────────────────────────

async function getPocsByPartner(partnerId) {
  const pocs = await pocRepo.findByPartnerId(partnerId);
  return pocs;
}

async function getPocById(id) {
  const poc = await pocRepo.findById(id);
  if (!poc) throw notFound('POC not found');
  return poc;
}

// ── Create ────────────────────────────────────────────────────────────────────

async function createPoc(partnerId, data, userId) {
  const { poc_name, poc_designation, poc_contact, poc_email, date_of_first_contact } = data;

  // Duplicate check: same contact number for this partner
  const existing = await pocRepo.checkDuplicate(partnerId, poc_contact);
  if (existing) {
    throw Object.assign(new Error('A POC with this contact number already exists for this partner'), {
      statusCode: 409,
      duplicate: existing,
    });
  }

  const result = await sequelize.transaction(async (t) => {
    // Create Poc record — partner_id is legacy FK on the model; junction is poc_partners
    const poc = await pocRepo.create(
      {
        partner_id: partnerId,
        poc_name,
        poc_designation: poc_designation || 'N/A',
        poc_contact: String(poc_contact),
        poc_email: poc_email || '',
        date_of_first_contact: date_of_first_contact || new Date(),
        removed: false,
      },
      t
    );

    // Create PocPartner junction
    await pocRepo.createPocPartner(poc.id, partnerId, t);

    // Auto-create initial meeting (first contact)
    await meetingRepo.create(
      {
        user_id: parseInt(userId),
        poc_id: poc.id,
        partner_id: partnerId,
        meeting_date: date_of_first_contact || new Date(),
        meeting_notes: null,
        follow_up_meeting_scheduled: false,
      },
      t
    );

    return poc;
  });

  return result;
}

// ── Update ────────────────────────────────────────────────────────────────────

async function updatePoc(id, data) {
  const poc = await pocRepo.findById(id);
  if (!poc) throw notFound('POC not found');

  const updateData = {};
  const allowed = ['poc_name', 'poc_designation', 'poc_contact', 'poc_email', 'date_of_first_contact'];
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  // Normalize poc_contact to string
  if (updateData.poc_contact) updateData.poc_contact = String(updateData.poc_contact);

  return pocRepo.update(id, updateData);
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deletePoc(id) {
  const poc = await pocRepo.findById(id);
  if (!poc) throw notFound('POC not found');

  await pocRepo.softDelete(id);
}

// ── Add Meeting ───────────────────────────────────────────────────────────────

async function addMeeting(partnerId, pocId, data, userId) {
  const poc = await pocRepo.findById(pocId);
  if (!poc || poc.partner_id !== parseInt(partnerId)) {
    throw notFound('POC not found for this partner');
  }

  const meeting = await meetingRepo.create({
    user_id: userId,
    poc_id: pocId,
    partner_id: partnerId,
    meeting_date: data.meeting_date,
    meeting_notes: data.meeting_notes || null,
    follow_up_meeting_scheduled: data.follow_up_meeting_scheduled || false,
    follow_up_meeting_date: data.follow_up_meeting_date || null,
  });

  return meeting;
}

module.exports = {
  listAll,
  getPocsByPartner,
  getPocById,
  createPoc,
  updatePoc,
  deletePoc,
  addMeeting,
};
