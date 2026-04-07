'use strict';

const { sequelize, PartnerCo, VendorPartnerDetail } = require('../../models');
const vendorRepo = require('../repositories/vendor.repository');
const partnerRepo = require('../repositories/partner.repository');
const agreementRepo = require('../repositories/agreement.repository');
const engagementRepo = require('../repositories/engagement.repository');
const partnerSvc = require('./partner.service');
const STAGE_CONFIGS = require('../config/stage-configs');

async function getVendorList(userId, userRole, params) {
  return vendorRepo.findAll({ ...params, userId, userRole });
}

async function getVendorById(id) {
  const vendor = await vendorRepo.findById(id);
  if (!vendor) return null;

  const engagements = await engagementRepo.findByPartnerId(id);
  return { ...vendor, engagements };
}

async function createVendor(data, userId) {
  const { name, vendor_type, state_id, city_id, co_id, services_description } = data;

  if (!name) throw Object.assign(new Error('Vendor name is required'), { statusCode: 400 });
  if (!vendor_type) throw Object.assign(new Error('Vendor type is required'), { statusCode: 400 });
  if (!state_id) throw Object.assign(new Error('State is required'), { statusCode: 400 });
  if (!city_id) throw Object.assign(new Error('City is required'), { statusCode: 400 });
  if (!co_id) throw Object.assign(new Error('CO assignment is required'), { statusCode: 400 });

  const t = await sequelize.transaction();
  try {
    const partner = await vendorRepo.create(data, userId, t);

    await VendorPartnerDetail.create({
      partner_id: partner.id,
      vendor_type: vendor_type || null,
      services_description: services_description || null,
    }, { transaction: t });

    await PartnerCo.create({
      partner_id: partner.id,
      co_id: parseInt(co_id),
      is_active: true,
      assigned_by: String(userId),
    }, { transaction: t });

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

async function updateVendorDetails(id, data) {
  const partner = await partnerRepo.findById(id, 'vendor');
  if (!partner) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  await vendorRepo.updateDetails(id, data);
  return getVendorById(id);
}

async function uploadContract(vendorId, fileBuffer, fileName, mimeType) {
  // Store filename as contract_document (real S3 integration can be added later)
  await vendorRepo.updateDetails(vendorId, { contract_document: fileName });
  return getVendorById(vendorId);
}

async function updateStage(partnerId, newStage, data, userId) {
  const config = STAGE_CONFIGS.vendor;
  if (!config.stages.includes(newStage)) {
    throw Object.assign(new Error(`Invalid stage: ${newStage}`), { statusCode: 400 });
  }
  return partnerSvc.updateStage(partnerId, newStage, data, userId, 'vendor');
}

async function addEngagement(vendorId, data) {
  const partner = await partnerRepo.findById(vendorId, 'vendor');
  if (!partner) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  return engagementRepo.create({ partner_id: parseInt(vendorId), ...data });
}

async function updateEngagement(id, data) {
  return engagementRepo.update(id, data);
}

async function deleteEngagement(id, vendorId) {
  return engagementRepo.softDelete(id, parseInt(vendorId));
}

async function deleteVendor(id, userRole) {
  if (!['admin', 'super_admin'].includes(userRole)) {
    throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
  }
  const partner = await partnerRepo.findById(id, 'vendor');
  if (!partner) throw Object.assign(new Error('Vendor not found'), { statusCode: 404 });
  await vendorRepo.softDelete(id);
}

module.exports = {
  getVendorList,
  getVendorById,
  createVendor,
  updateVendorDetails,
  uploadContract,
  updateStage,
  addEngagement,
  updateEngagement,
  deleteEngagement,
  deleteVendor,
};
