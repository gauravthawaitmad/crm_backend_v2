'use strict';

const { sequelize, VendorEngagement, VendorPartnerDetail } = require('../../models');
const { QueryTypes } = require('sequelize');

/**
 * After any create/update/delete, recalculate average_rating and total_engagements
 * in vendor_partner_details for the given vendor partner.
 */
async function recalculateRatings(partnerId) {
  const rows = await sequelize.query(
    `SELECT
       ROUND(AVG(rating_overall)::numeric, 2) AS avg_rating,
       COUNT(*) AS total
     FROM mad_crm_dev.vendor_engagements
     WHERE partner_id = :partnerId AND removed = false`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );

  const avg = parseFloat(rows[0]?.avg_rating) || 0;
  const total = parseInt(rows[0]?.total) || 0;

  await sequelize.query(
    `UPDATE mad_crm_dev.vendor_partner_details
     SET average_rating = :avg, total_engagements = :total, "updatedAt" = NOW()
     WHERE partner_id = :partnerId`,
    { replacements: { avg, total, partnerId }, type: QueryTypes.UPDATE }
  );
}

async function findByPartnerId(partnerId) {
  return sequelize.query(
    `SELECT ve.*,
            p.partner_name AS school_name
     FROM mad_crm_dev.vendor_engagements ve
     LEFT JOIN mad_crm_dev.partners p ON p.id = ve.school_partner_id
     WHERE ve.partner_id = :partnerId AND ve.removed = false
     ORDER BY ve.engagement_date DESC`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );
}

async function create(data) {
  const record = await VendorEngagement.create({
    partner_id: data.partner_id,
    engagement_name: data.engagement_name,
    school_partner_id: data.school_partner_id || null,
    engagement_date: data.engagement_date,
    service_provided: data.service_provided,
    rating_overall: data.rating_overall,
    rating_quality: data.rating_quality || null,
    rating_timeliness: data.rating_timeliness || null,
    rating_cost: data.rating_cost || null,
    notes: data.notes || null,
  });
  await recalculateRatings(data.partner_id);
  return record;
}

async function update(id, data) {
  const record = await VendorEngagement.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Engagement not found');
    err.statusCode = 404;
    throw err;
  }
  const allowed = [
    'engagement_name', 'school_partner_id', 'engagement_date', 'service_provided',
    'rating_overall', 'rating_quality', 'rating_timeliness', 'rating_cost', 'notes',
  ];
  const patch = {};
  allowed.forEach((k) => { if (k in data) patch[k] = data[k]; });
  await record.update(patch);
  await recalculateRatings(record.partner_id);
  return record;
}

async function softDelete(id, partnerId) {
  const record = await VendorEngagement.findOne({ where: { id, removed: false } });
  if (!record) {
    const err = new Error('Engagement not found');
    err.statusCode = 404;
    throw err;
  }
  await record.update({ removed: true });
  await recalculateRatings(partnerId);
  return record;
}

module.exports = { findByPartnerId, create, update, softDelete };
