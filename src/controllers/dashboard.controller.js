'use strict';

const dashboardService = require('../services/dashboard.service');
const deliverableRepo = require('../repositories/deliverable.repository');
const ResponseHandler = require('../handlers/response.handler');

async function getMetrics(req, res) {
  try {
    const { user_id, user_role } = req.user;
    const metrics = await dashboardService.getMetrics(user_id, user_role);
    return ResponseHandler.success(res, metrics);
  } catch (err) {
    console.error('[Dashboard] getMetrics error:', err.message, err.stack);
    return ResponseHandler.error(res, err.message || 'Failed to load dashboard metrics');
  }
}

async function getDeliverables(req, res) {
  try {
    const { user_id, user_role } = req.user;
    const partnerIds = await dashboardService.resolvePartnerScope(user_id, user_role);
    if (Array.isArray(partnerIds) && partnerIds.length === 0) {
      return ResponseHandler.success(res, { overdue: [], due_soon: [] });
    }
    // partnerIds=null means admin sees all; pass null through to repo
    const result = await deliverableRepo.getDueThisMonth(partnerIds);
    return ResponseHandler.success(res, result);
  } catch (err) {
    console.error('[Dashboard] getDeliverables error:', err.message);
    return ResponseHandler.error(res, err.message || 'Failed to load deliverables');
  }
}

module.exports = { getMetrics, getDeliverables };
