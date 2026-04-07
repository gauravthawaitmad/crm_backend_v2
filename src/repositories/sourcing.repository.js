'use strict';

const { sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');
const partnerRepo = require('./partner.repository');

/**
 * Batch-fetch sourcing_partner_details for a set of partner IDs.
 */
async function _batchSourcingDetails(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT * FROM sourcing_partner_details
     WHERE partner_id IN (:partnerIds) AND removed = false`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Paginated list of sourcing partners.
 * Enriches with sourcing_partner_details + currentStage from latest agreement.
 */
async function findAll(params) {
  const result = await partnerRepo.findAll({ ...params, entityType: 'sourcing' });
  if (!result.rows.length) return result;

  const partnerIds = result.rows.map((p) => p.id);
  const detailsMap = await _batchSourcingDetails(partnerIds);

  const enriched = result.rows.map((p) => ({
    ...p,
    sourcingDetail: detailsMap.get(p.id) || null,
    currentStage: p.latestAgreement?.conversion_stage || 'identified',
  }));

  return { ...result, rows: enriched };
}

/**
 * Full detail for a single sourcing partner.
 */
async function findById(id) {
  const partner = await partnerRepo.findById(id, 'sourcing');
  if (!partner) return null;

  const p = partner.toJSON ? partner.toJSON() : { ...partner };

  const [detailRows, commitments, schoolTags] = await Promise.all([
    sequelize.query(
      `SELECT * FROM sourcing_partner_details WHERE partner_id = :id AND removed = false LIMIT 1`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      `SELECT * FROM partner_commitments
       WHERE partner_id = :id AND removed = false
       ORDER BY COALESCE(start_date, "createdAt") DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
    sequelize.query(
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
       WHERE pst.partner_id = :id AND pst.removed = false
       ORDER BY pst.id DESC`,
      { replacements: { id }, type: QueryTypes.SELECT }
    ),
  ]);

  // Build stage history from agreements
  const sortedAgreements = (p.agreements || []).sort((a, b) => b.id - a.id);
  const currentStage = sortedAgreements[0]?.conversion_stage || 'identified';

  // Build latestCo from partnerCos (first entry is most recent, ordered by id DESC)
  const latestCo = p.partnerCos?.[0]
    ? { co_id: p.partnerCos[0].co_id, co: p.partnerCos[0].co }
    : null;

  return {
    ...p,
    sourcingDetail: detailRows[0] || null,
    commitments,
    tagged_schools: schoolTags,
    currentStage,
    latestCo,
    stage_history: sortedAgreements.map((a) => ({
      id: a.id,
      stage: a.conversion_stage,
      changed_by: a.changed_by,
      changed_at: a.createdAt,
      notes: a.non_conversion_reason || null,
    })),
  };
}

/**
 * Update sourcing_partner_details for a partner.
 */
async function updateDetail(partnerId, data) {
  const allowed = [
    'organization_type', 'volunteers_committed', 'volunteers_deployed',
    'org_type', 'website', 'volunteer_capacity', 'notes',
  ];
  const fields = [];
  const replacements = { partnerId };

  allowed.forEach((key) => {
    if (key in data) {
      fields.push(`"${key}" = :${key}`);
      replacements[key] = data[key];
    }
  });

  if (!fields.length) return;

  await sequelize.query(
    `UPDATE sourcing_partner_details
     SET ${fields.join(', ')}, "updatedAt" = NOW()
     WHERE partner_id = :partnerId AND removed = false`,
    { replacements, type: QueryTypes.UPDATE }
  );
}

module.exports = { findAll, findById, updateDetail };
