/**
 * organization.controller.js
 *
 * Thin controller — validates input, delegates to service, sends response.
 */

const orgService = require('../services/organization.service');
const ResponseHandler = require('../handlers/response.handler');
const { renewMouSchema, reallocateSchema, listQuerySchema } = require('../validators/organization.validator');

async function list(req, res, next) {
  try {
    const { error, value } = listQuerySchema.validate(req.query);
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const result = await orgService.getOrganizationList(req.user.user_id, req.user.user_role, value);
    return ResponseHandler.paginated(res, result.organizations, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: value.limit,
    });
  } catch (err) {
    next(err);
  }
}

async function detail(req, res, next) {
  try {
    const org = await orgService.getOrganizationById(Number(req.params.id));
    return ResponseHandler.success(res, org);
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function renewMou(req, res, next) {
  try {
    const { error, value } = renewMouSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    if (!req.file) {
      return ResponseHandler.validationError(res, ['MOU document (PDF) is required']);
    }

    const result = await orgService.renewMou(
      Number(req.params.id),
      value,
      req.file.buffer,
      req.file.originalname,
      req.user.user_id
    );
    return ResponseHandler.success(res, result, 'MOU renewed successfully');
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function reallocateCo(req, res, next) {
  try {
    const { error, value } = reallocateSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const result = await orgService.reallocateCo(
      Number(value.partner_id),
      String(value.new_co_id),
      req.user.user_id
    );
    return ResponseHandler.success(res, result, 'Partner reallocated successfully');
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await orgService.deleteOrganization(Number(req.params.id));
    return ResponseHandler.success(res, null, 'Organization deleted successfully');
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function esc(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatDateCsv(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN');
}

function getDaysLeft(endDate) {
  if (!endDate) return '';
  const days = Math.round((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
  return days;
}

function getMouStatusLabel(endDate) {
  if (!endDate) return '';
  const days = getDaysLeft(endDate);
  if (days < 0) return 'Expired';
  if (days < 30) return 'Expiring Soon (Urgent)';
  if (days < 60) return 'Expiring Soon';
  return 'Active';
}

// ── Export ────────────────────────────────────────────────────────────────────

async function exportOrganizations(req, res, next) {
  try {
    const { listQuerySchema } = require('../validators/organization.validator');
    const { error, value } = listQuerySchema.validate({ ...req.query, limit: 10000, page: 1 });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const result = await orgService.getOrganizationList(req.user.user_id, req.user.user_role, value);
    const orgs = result.organizations;

    const HEADERS = [
      'Organization Name', 'State', 'City', 'Pincode',
      'Assigned CO', 'MOU Sign Date', 'MOU Start Date', 'MOU End Date',
      'Confirmed Child Count', 'Days Until Expiry', 'MOU Status',
    ];

    const rows = orgs.map((o) => {
      const mou = o.activeMou;
      return [
        o.partner_name,
        o.state?.state_name ?? '',
        o.city?.city_name ?? '',
        o.pincode ?? '',
        o.latestCo?.co?.user_display_name ?? '',
        formatDateCsv(mou?.mou_sign_date),
        formatDateCsv(mou?.mou_start_date),
        formatDateCsv(mou?.mou_end_date),
        mou?.confirmed_child_count ?? '',
        getDaysLeft(mou?.mou_end_date),
        getMouStatusLabel(mou?.mou_end_date),
      ].map(esc).join(',');
    });

    const csv = [HEADERS.map(esc).join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="organizations-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, renewMou, reallocateCo, remove, exportOrganizations };
