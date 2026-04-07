/**
 * lead.controller.js
 *
 * Thin controller — validates input, delegates to service, sends response.
 * Max ~30 lines per function.
 */

const leadService = require('../services/lead.service');
const ResponseHandler = require('../handlers/response.handler');
const { createLeadSchema, updateStageSchema, listQuerySchema } = require('../validators/lead.validator');

async function list(req, res, next) {
  try {
    const { error, value } = listQuerySchema.validate(req.query);
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const result = await leadService.getLeadList(req.user.user_id, req.user.user_role, value);
    return ResponseHandler.paginated(res, result.leads, {
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
    const lead = await leadService.getLeadById(Number(req.params.id));
    return ResponseHandler.success(res, lead);
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { error, value } = createLeadSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const lead = await leadService.createLead(value, req.user.user_id);
    return ResponseHandler.created(res, lead, 'Lead created successfully');
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function update(req, res, next) {
  try {
    // For multipart/form-data (converted stage with file), body comes from multer.
    // For JSON stages, body comes from express.json().
    const body = req.body;

    const { error, value } = updateStageSchema.validate(body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const { conversion_stage, ...stageData } = value;
    const result = await leadService.updateLeadStage(
      Number(req.params.id),
      conversion_stage,
      stageData,
      req.user.user_id,
      req.file || null  // multer file (only for 'converted' stage)
    );

    const message = result.isConverted
      ? 'Lead converted to organization successfully'
      : 'Lead stage updated successfully';

    return ResponseHandler.success(res, result, message);
  } catch (err) {
    console.error('[Lead] update error:', err.message, err.stack);
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await leadService.deleteLead(Number(req.params.id));
    return ResponseHandler.success(res, null, 'Lead deleted successfully');
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

// ── Export ────────────────────────────────────────────────────────────────────

async function exportLeads(req, res, next) {
  try {
    const { error, value } = listQuerySchema.validate({ ...req.query, limit: 10000, page: 1 });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const result = await leadService.getLeadList(req.user.user_id, req.user.user_role, value);
    const leads = result.leads;

    const HEADERS = [
      'Partner Name', 'State', 'City', 'Pincode',
      'Address Line 1', 'Address Line 2', 'Lead Source',
      'Conversion Stage', 'Assigned CO',
      'POC Name', 'POC Contact', 'POC Email',
      'Potential Child Count', 'Date of First Contact',
      'Non Conversion Reason', 'Created Date', 'Last Updated',
    ];

    const rows = leads.map((l) => [
      l.partner_name,
      l.state?.state_name ?? '',
      l.city?.city_name ?? '',
      l.pincode ?? '',
      l.address_line_1 ?? '',
      l.address_line_2 ?? '',
      l.lead_source ?? '',
      l.latestAgreement?.conversion_stage ?? '',
      l.latestCo?.co?.user_display_name ?? '',
      l.latestPoc?.poc_name ?? '',
      l.latestPoc?.poc_contact ?? '',
      l.latestPoc?.poc_email ?? '',
      l.latestAgreement?.potential_child_count ?? '',
      formatDateCsv(l.latestPoc?.date_of_first_contact),
      l.latestAgreement?.non_conversion_reason ?? '',
      formatDateCsv(l.createdAt),
      formatDateCsv(l.updatedAt),
    ].map(esc).join(','));

    const csv = [HEADERS.map(esc).join(','), ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${date}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, create, update, remove, exportLeads };
