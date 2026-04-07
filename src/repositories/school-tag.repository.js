'use strict';

const { PartnerSchoolTag, sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

async function findByPartnerId(partnerId) {
  return sequelize.query(
    `SELECT pst.id, pst.partner_id, pst.school_partner_id, pst.tagged_by,
            p.partner_name AS school_name,
            c.city_name AS city, s.state_name AS state,
            ag.conversion_stage AS status
     FROM partner_school_tags pst
     INNER JOIN partners p ON p.id = pst.school_partner_id AND p.removed = false
     LEFT JOIN cities c ON c.id = p.city_id
     LEFT JOIN states s ON s.id = p.state_id
     LEFT JOIN LATERAL (
       SELECT conversion_stage FROM partner_agreements
       WHERE partner_id = pst.school_partner_id AND removed = false
       ORDER BY id DESC LIMIT 1
     ) ag ON true
     WHERE pst.partner_id = :partnerId AND pst.removed = false
     ORDER BY pst.id DESC`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );
}

/**
 * Used by commitment.routes.js (legacy route) — checks for duplicate before creating.
 */
async function create(data) {
  const existing = await PartnerSchoolTag.findOne({
    where: { partner_id: data.partner_id, school_partner_id: data.school_partner_id, removed: false },
  });
  if (existing) {
    const err = new Error('This school is already tagged for this partner');
    err.statusCode = 409;
    throw err;
  }
  return PartnerSchoolTag.create(data);
}

/**
 * Used by sourcing.service.js — upsert semantics (returns existing if already tagged).
 */
async function addTag(partnerId, schoolPartnerId, userId) {
  const existing = await PartnerSchoolTag.findOne({
    where: { partner_id: partnerId, school_partner_id: schoolPartnerId, removed: false },
  });
  if (existing) return existing;

  return PartnerSchoolTag.create({
    partner_id: partnerId,
    school_partner_id: schoolPartnerId,
    tagged_by: String(userId),
  });
}

async function removeTag(partnerId, schoolPartnerId) {
  await PartnerSchoolTag.update(
    { removed: true },
    { where: { partner_id: partnerId, school_partner_id: schoolPartnerId, removed: false } }
  );
}

/**
 * Used by commitment.routes.js (legacy route) — deletes by tag ID.
 */
async function softDelete(id, userId) {
  const record = await PartnerSchoolTag.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('School tag not found');
    err.statusCode = 404;
    throw err;
  }
  await record.update({ removed: true });
  return record;
}

async function getAvailableSchools(search) {
  const searchFilter = search ? `AND p.partner_name ILIKE :search` : '';
  const replacements = search ? { search: `%${search}%` } : {};

  return sequelize.query(
    `SELECT p.id, p.partner_name,
            c.city_name AS city, s.state_name AS state,
            ag.conversion_stage AS status
     FROM partners p
     LEFT JOIN cities c ON c.id = p.city_id
     LEFT JOIN states s ON s.id = p.state_id
     LEFT JOIN LATERAL (
       SELECT conversion_stage FROM partner_agreements
       WHERE partner_id = p.id AND removed = false
       ORDER BY id DESC LIMIT 1
     ) ag ON true
     WHERE p.entity_type = 'school'
       AND p.removed = false
       AND ag.conversion_stage = 'converted'
       ${searchFilter}
     ORDER BY p.partner_name
     LIMIT 20`,
    { replacements, type: QueryTypes.SELECT }
  );
}

module.exports = { findByPartnerId, create, addTag, removeTag, softDelete, getAvailableSchools };
