'use strict';

const { sequelize, VendorPartnerDetail, PartnerCo } = require('../../models');
const { QueryTypes } = require('sequelize');
const partnerRepo = require('./partner.repository');

/**
 * Batch-fetch vendor_partner_details for a set of partner IDs.
 */
async function _batchVendorDetails(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT * FROM mad_crm_dev.vendor_partner_details WHERE partner_id IN (:partnerIds)`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Paginated list of vendor partners with enriched detail + ratings.
 */
async function findAll(params) {
  const { vendor_type, sort_by } = params;
  const result = await partnerRepo.findAll({ ...params, entityType: 'vendor' });
  if (!result.rows.length) return result;

  const partnerIds = result.rows.map((p) => p.id);
  const detailsMap = await _batchVendorDetails(partnerIds);

  const enriched = result.rows.map((p) => {
    const detail = detailsMap.get(p.id) || {};
    return {
      ...p,
      vendor_type: detail.vendor_type || null,
      services_description: detail.services_description || null,
      average_rating: parseFloat(detail.average_rating) || 0,
      total_engagements: parseInt(detail.total_engagements) || 0,
      currentStage: p.latestAgreement?.conversion_stage || 'identified',
    };
  });

  // Apply sort_by on enriched data if needed (base repo handles updatedAt + name)
  if (sort_by === 'rating') {
    enriched.sort((a, b) => b.average_rating - a.average_rating);
  }

  return { ...result, rows: enriched };
}

/**
 * Full detail for a single vendor partner.
 */
async function findById(id) {
  const partner = await partnerRepo.findById(id, 'vendor');
  if (!partner) return null;

  const p = partner.toJSON ? partner.toJSON() : { ...partner };

  const [detailRows, schoolTags] = await Promise.all([
    sequelize.query(
      `SELECT * FROM mad_crm_dev.vendor_partner_details WHERE partner_id = :id LIMIT 1`,
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

  const vendorDetail = detailRows[0] || {};
  const agreements = p.agreements || [];
  const latestAgreement = agreements[0] || null;
  const partnerCos = p.partnerCos || [];
  const latestCo = partnerCos[0] || null;
  const pocs = (p.pocPartners || []).map((pp) => pp.poc).filter(Boolean);

  return {
    id: p.id,
    name: p.partner_name,
    entity_type: p.entity_type,
    vendor_type: vendorDetail.vendor_type || null,
    services_description: vendorDetail.services_description || null,
    contract_services: vendorDetail.contract_services || null,
    contract_document: vendorDetail.contract_document || null,
    average_rating: parseFloat(vendorDetail.average_rating) || 0,
    total_engagements: parseInt(vendorDetail.total_engagements) || 0,
    state: p.state ? { id: p.state.id, name: p.state.state_name } : null,
    city: p.city ? { id: p.city.id, name: p.city.city_name } : null,
    currentStage: latestAgreement?.conversion_stage || 'identified',
    stage_history: agreements,
    assigned_co: latestCo
      ? {
          user_id: latestCo.co?.user_id,
          user_display_name: latestCo.co?.user_display_name,
          user_role: latestCo.co?.user_role,
        }
      : null,
    pocs,
    tagged_schools: schoolTags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function create(data, userId, t) {
  return partnerRepo.create({
    partner_name: data.name,
    entity_type: 'vendor',
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
  const baseFields = {};
  if (data.name) baseFields.partner_name = data.name;
  if (data.state_id != null) baseFields.state_id = data.state_id;
  if (data.city_id != null) baseFields.city_id = data.city_id;
  if (Object.keys(baseFields).length) {
    await partnerRepo.update(partnerId, baseFields);
  }

  const [detail] = await VendorPartnerDetail.findOrCreate({
    where: { partner_id: partnerId },
    defaults: { partner_id: partnerId },
  });
  const detailFields = {};
  if (data.vendor_type != null) detailFields.vendor_type = data.vendor_type;
  if (data.services_description != null) detailFields.services_description = data.services_description;
  if (data.contract_services != null) detailFields.contract_services = data.contract_services;
  if (data.contract_document != null) detailFields.contract_document = data.contract_document;
  if (Object.keys(detailFields).length) {
    await detail.update(detailFields);
  }
}

async function softDelete(id) {
  await partnerRepo.update(id, { removed: true });
}

module.exports = { findAll, findById, create, updateDetails, softDelete };
