'use strict';

const { sequelize, FunderPartnerDetail, PartnerCo } = require('../../models');
const { QueryTypes } = require('sequelize');
const partnerRepo = require('./partner.repository');

/**
 * Batch-fetch funder_partner_details for a set of partner IDs.
 */
async function _batchFunderDetails(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT * FROM mad_crm_dev.funder_partner_details WHERE partner_id IN (:partnerIds)`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Batch-fetch the most recently created active commitment per partner.
 */
async function _batchActiveCommitments(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON (partner_id) *
     FROM mad_crm_dev.partner_commitments
     WHERE partner_id IN (:partnerIds)
       AND entity_type = 'funder'
       AND removed = false
       AND status NOT IN ('cancelled', 'completed')
     ORDER BY partner_id, id DESC`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Paginated list of funder partners.
 */
async function findAll(params) {
  const result = await partnerRepo.findAll({ ...params, entityType: 'funder' });
  if (!result.rows.length) return result;

  const partnerIds = result.rows.map((p) => p.id);
  const [detailsMap, commitmentMap] = await Promise.all([
    _batchFunderDetails(partnerIds),
    _batchActiveCommitments(partnerIds),
  ]);

  const enriched = result.rows.map((p) => ({
    ...p,
    funderDetail: detailsMap.get(p.id) || null,
    funder_type: detailsMap.get(p.id)?.funder_type || null,
    active_commitment: commitmentMap.get(p.id) || null,
    currentStage: p.latestAgreement?.conversion_stage || 'prospect',
  }));

  return { ...result, rows: enriched };
}

/**
 * Full detail for a single funder partner.
 */
async function findById(id) {
  const partner = await partnerRepo.findById(id, 'funder');
  if (!partner) return null;

  const p = partner.toJSON ? partner.toJSON() : { ...partner };

  const [detailRows, commitments, schoolTags] = await Promise.all([
    sequelize.query(
      `SELECT * FROM mad_crm_dev.funder_partner_details WHERE partner_id = :id LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT * FROM mad_crm_dev.partner_commitments
       WHERE partner_id = :id AND entity_type = 'funder' AND removed = false
       ORDER BY COALESCE(start_date, "createdAt") DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT pst.id, pst.partner_id, pst.school_partner_id, pst.tagged_by,
              p.partner_name AS school_name,
              c.city_name AS city, s.state_name AS state,
              ag.conversion_stage AS status
       FROM mad_crm_dev.partner_school_tags pst
       INNER JOIN mad_crm_dev.partners p ON p.id = pst.school_partner_id AND p.removed = false
       LEFT JOIN mad_crm_dev.cities c ON c.id = p.city_id
       LEFT JOIN mad_crm_dev.states s ON s.id = p.state_id
       LEFT JOIN LATERAL (
         SELECT conversion_stage FROM mad_crm_dev.partner_agreements
         WHERE partner_id = pst.school_partner_id AND removed = false
         ORDER BY id DESC LIMIT 1
       ) ag ON true
       WHERE pst.partner_id = :id AND pst.removed = false
       ORDER BY pst.id DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
  ]);

  const funderDetail = detailRows[0] || {};

  // Extract structured data from the partner model
  const agreements = p.agreements || [];
  const latestAgreement = agreements[0] || null;
  const partnerCos = p.partnerCos || [];
  const latestCo = partnerCos[0] || null;
  const pocs = (p.pocPartners || []).map((pp) => pp.poc).filter(Boolean);

  return {
    id: p.id,
    name: p.partner_name,
    entity_type: p.entity_type,
    funder_type: funderDetail.funder_type || null,
    website: funderDetail.website || null,
    notes: funderDetail.notes || null,
    state: p.state ? { id: p.state.id, name: p.state.state_name } : null,
    city: p.city ? { id: p.city.id, name: p.city.city_name } : null,
    currentStage: latestAgreement?.conversion_stage || 'prospect',
    stage_history: agreements,
    assigned_co: latestCo
      ? {
          user_id: latestCo.co?.user_id,
          user_display_name: latestCo.co?.user_display_name,
          user_role: latestCo.co?.user_role,
        }
      : null,
    pocs,
    commitments,
    tagged_schools: schoolTags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/**
 * Create a new funder partner (within a transaction).
 */
async function create(data, userId, t) {
  return partnerRepo.create({
    partner_name: data.name,
    entity_type: 'funder',
    state_id: data.state_id || null,
    city_id: data.city_id || null,
    address_line_1: '',
    pincode: 0,
    lead_source: 'direct',
    created_by: parseInt(userId),
    removed: false,
  }, t);
}

async function updateDetails(partnerId, data) {
  // Update base partner fields
  const baseFields = {};
  if (data.name) baseFields.partner_name = data.name;
  if (data.state_id != null) baseFields.state_id = data.state_id;
  if (data.city_id != null) baseFields.city_id = data.city_id;
  if (Object.keys(baseFields).length) {
    await partnerRepo.update(partnerId, baseFields);
  }

  // Update funder_partner_details
  const [detail] = await FunderPartnerDetail.findOrCreate({
    where: { partner_id: partnerId },
    defaults: { partner_id: partnerId },
  });
  const detailFields = {};
  if (data.funder_type != null) detailFields.funder_type = data.funder_type;
  if (data.website != null) detailFields.website = data.website;
  if (data.notes != null) detailFields.notes = data.notes;
  if (Object.keys(detailFields).length) {
    await detail.update(detailFields);
  }
}

async function softDelete(id) {
  await partnerRepo.update(id, { removed: true });
}

module.exports = { findAll, findById, create, updateDetails, softDelete };
