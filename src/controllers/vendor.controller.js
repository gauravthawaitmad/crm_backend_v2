'use strict';

const multer = require('multer');
const vendorSvc = require('../services/vendor.service');
const engagementRepo = require('../repositories/engagement.repository');
const ResponseHandler = require('../handlers/response.handler');
const {
  createVendorSchema,
  updateDetailsSchema,
  updateStageSchema,
  addEngagementSchema,
  updateEngagementSchema,
  listQuerySchema,
} = require('../validators/vendor.validator');

const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single('contract');

function _handleError(res, err) {
  const status = err.statusCode || 500;
  return ResponseHandler.error(res, err.message || 'An error occurred', status);
}

// ── List ──────────────────────────────────────────────────────────────────────

exports.list = async (req, res) => {
  try {
    const { error, value } = listQuerySchema.validate(req.query, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);

    const { page = 1, limit = 20, search, stage, vendor_type, sort_by } = value;
    const p = parseInt(page);
    const l = parseInt(limit);

    const result = await vendorSvc.getVendorList(req.user.user_id, req.user.user_role, {
      page: p, limit: l, search, stage, vendor_type, sort_by,
    });

    const totalPages = Math.ceil(result.count / l);
    return ResponseHandler.paginated(res, result.rows, { page: p, limit: l, total: result.count, totalPages });
  } catch (err) {
    console.error('[vendor.list]', err);
    return _handleError(res, err);
  }
};

// ── Export CSV ────────────────────────────────────────────────────────────────

exports.exportVendors = async (req, res) => {
  try {
    const result = await vendorSvc.getVendorList(req.user.user_id, req.user.user_role, {
      page: 1, limit: 10000,
    });

    const rows = result.rows || [];
    const date = new Date().toISOString().slice(0, 10);

    const header = ['Vendor Name', 'Type', 'Services', 'Avg Rating', 'Total Engagements', 'Stage', 'Assigned CO', 'City', 'State', 'Created Date'];
    const csvRows = rows.map((r) => [
      r.partner_name || r.name || '',
      r.vendor_type || '',
      (r.services_description || '').replace(/,/g, ';').replace(/\n/g, ' '),
      r.average_rating || 0,
      r.total_engagements || 0,
      r.currentStage || r.status || '',
      r.latestCo?.co?.user_display_name || r.assigned_co?.user_display_name || '',
      r.city?.city_name || r.city?.name || '',
      r.state?.state_name || r.state?.name || '',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '',
    ].join(','));

    const csv = [header.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vendors-${date}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('[vendor.exportVendors]', err);
    return _handleError(res, err);
  }
};

// ── Detail ────────────────────────────────────────────────────────────────────

exports.detail = async (req, res) => {
  try {
    const vendor = await vendorSvc.getVendorById(req.params.id);
    if (!vendor) return ResponseHandler.notFound(res, 'Vendor not found');
    return ResponseHandler.success(res, vendor);
  } catch (err) {
    console.error('[vendor.detail]', err);
    return _handleError(res, err);
  }
};

// ── Create ────────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const { error, value } = createVendorSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const vendor = await vendorSvc.createVendor(value, req.user.user_id);
    return ResponseHandler.created(res, vendor);
  } catch (err) {
    console.error('[vendor.create]', err);
    return _handleError(res, err);
  }
};

// ── Update Details ────────────────────────────────────────────────────────────

exports.updateDetails = async (req, res) => {
  try {
    const { error, value } = updateDetailsSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const vendor = await vendorSvc.updateVendorDetails(req.params.id, value);
    return ResponseHandler.success(res, vendor);
  } catch (err) {
    console.error('[vendor.updateDetails]', err);
    return _handleError(res, err);
  }
};

// ── Stage Update ──────────────────────────────────────────────────────────────

exports.updateStage = async (req, res) => {
  try {
    const { error, value } = updateStageSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    await vendorSvc.updateStage(req.params.id, value.stage, value, req.user.user_id);
    const vendor = await vendorSvc.getVendorById(req.params.id);
    return ResponseHandler.success(res, vendor);
  } catch (err) {
    console.error('[vendor.updateStage]', err);
    return _handleError(res, err);
  }
};

// ── Upload Contract ───────────────────────────────────────────────────────────

exports.uploadContract = async (req, res) => {
  try {
    if (!req.file) return ResponseHandler.validationError(res, [{ message: 'No file uploaded' }]);
    const vendor = await vendorSvc.uploadContract(
      req.params.id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    return ResponseHandler.success(res, vendor);
  } catch (err) {
    console.error('[vendor.uploadContract]', err);
    return _handleError(res, err);
  }
};

// ── Remove ────────────────────────────────────────────────────────────────────

exports.remove = async (req, res) => {
  try {
    await vendorSvc.deleteVendor(req.params.id, req.user.user_role);
    return ResponseHandler.success(res, { message: 'Vendor deleted' });
  } catch (err) {
    console.error('[vendor.remove]', err);
    return _handleError(res, err);
  }
};

// ── Engagements ───────────────────────────────────────────────────────────────

exports.listEngagements = async (req, res) => {
  try {
    const engagements = await engagementRepo.findByPartnerId(req.params.id);
    return ResponseHandler.success(res, engagements);
  } catch (err) {
    return _handleError(res, err);
  }
};

exports.addEngagement = async (req, res) => {
  try {
    const { error, value } = addEngagementSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const engagement = await vendorSvc.addEngagement(req.params.id, value);
    return ResponseHandler.created(res, engagement);
  } catch (err) {
    console.error('[vendor.addEngagement]', err);
    return _handleError(res, err);
  }
};

exports.updateEngagement = async (req, res) => {
  try {
    const { error, value } = updateEngagementSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const engagement = await vendorSvc.updateEngagement(req.params.engagementId, value);
    return ResponseHandler.success(res, engagement);
  } catch (err) {
    return _handleError(res, err);
  }
};

exports.deleteEngagement = async (req, res) => {
  try {
    // vendorId for recalculation is passed via query or body
    const vendorId = req.query.vendor_id || req.body.vendor_id;
    await vendorSvc.deleteEngagement(req.params.engagementId, vendorId);
    return ResponseHandler.success(res, { message: 'Engagement deleted' });
  } catch (err) {
    return _handleError(res, err);
  }
};
