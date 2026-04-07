'use strict';

/**
 * dashboard.service.js
 *
 * Aggregates role-scoped metrics for the dashboard page.
 * All queries respect the same RBAC visibility rules as lead/organization lists.
 */

const { sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

// ── Scope resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the set of partner IDs visible to this user.
 * Returns null to mean "all partners" (admin/super_admin).
 */
async function _resolvePartnerScope(userId, userRole) {
  if (['super_admin', 'admin'].includes(userRole)) return null; // all

  if (userRole === 'manager') {
    const rows = await sequelize.query(
      `SELECT DISTINCT pc.partner_id
       FROM partner_cos pc
       INNER JOIN manager_co mc ON mc.co_id = pc.co_id
       WHERE mc.manager_id = :userId`,
      { replacements: { userId: parseInt(userId) }, type: QueryTypes.SELECT }
    );
    return rows.map((r) => r.partner_id);
  }

  // CO roles — their own assignments only
  const rows = await sequelize.query(
    `SELECT DISTINCT partner_id
     FROM partner_cos
     WHERE co_id = :userId`,
    { replacements: { userId: parseInt(userId) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

/**
 * Build SQL WHERE clause for scope filtering.
 * If partnerIds is null → no restriction.
 * If partnerIds is empty array → no partners (return 0 for all).
 */
function _scopeWhere(partnerIds, alias = 'p') {
  if (partnerIds === null) return '';
  if (partnerIds.length === 0) return 'AND 1=0'; // empty scope
  return `AND ${alias}.id IN (${partnerIds.join(',')})`;
}

function _scopeWhereRaw(partnerIds, column = 'partner_id') {
  if (partnerIds === null) return '';
  if (partnerIds.length === 0) return 'AND 1=0';
  return `AND ${column} IN (${partnerIds.join(',')})`;
}

// ── Metric queries ─────────────────────────────────────────────────────────────

async function getMetrics(userId, userRole) {
  const partnerIds = await _resolvePartnerScope(userId, userRole);

  // If CO has no assignments, return zeroed metrics immediately
  if (partnerIds !== null && partnerIds.length === 0) {
    return _emptyMetrics();
  }

  const scopeP = _scopeWhere(partnerIds, 'p');

  // ── Latest stage per partner (non-removed partners only) ─────────────────
  const latestStages = await sequelize.query(
    `SELECT latest.conversion_stage, COUNT(*) AS cnt
     FROM (
       SELECT DISTINCT ON (pa.partner_id) pa.partner_id, pa.conversion_stage
       FROM partner_agreements pa
       INNER JOIN partners p ON p.id = pa.partner_id AND p.removed = false
       WHERE pa.removed = false ${scopeP}
       ORDER BY pa.partner_id, pa.id DESC
     ) latest
     GROUP BY latest.conversion_stage`,
    { type: QueryTypes.SELECT }
  );

  const byStage = {};
  latestStages.forEach((r) => { byStage[r.conversion_stage] = parseInt(r.cnt); });

  const total_leads =
    Object.entries(byStage)
      .filter(([s]) => s !== 'converted')
      .reduce((sum, [, n]) => sum + n, 0);

  const total_organizations = byStage['converted'] || 0;

  // ── Converted this calendar month ───────────────────────────────────────
  const [convertedMonth] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM partner_agreements pa
     INNER JOIN partners p ON p.id = pa.partner_id AND p.removed = false
     WHERE pa.conversion_stage = 'converted'
       AND date_trunc('month', pa."createdAt") = date_trunc('month', NOW())
       ${scopeP}`,
    { type: QueryTypes.SELECT }
  );

  // ── Dropped this calendar month ──────────────────────────────────────────
  const [droppedMonth] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM partner_agreements pa
     INNER JOIN partners p ON p.id = pa.partner_id AND p.removed = false
     WHERE pa.conversion_stage = 'dropped'
       AND date_trunc('month', pa."createdAt") = date_trunc('month', NOW())
       ${scopeP}`,
    { type: QueryTypes.SELECT }
  );

  // ── MOU metrics ───────────────────────────────────────────────────────────
  const [activeMous] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM mous m
     INNER JOIN partners p ON p.id = m.partner_id AND p.removed = false
     WHERE m.removed = false ${scopeP}`,
    { type: QueryTypes.SELECT }
  );

  const [expiringSoon] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM mous m
     INNER JOIN partners p ON p.id = m.partner_id AND p.removed = false
     WHERE m.mou_end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       AND m.removed = false ${scopeP}`,
    { type: QueryTypes.SELECT }
  );

  const [expiredMous] = await sequelize.query(
    `SELECT COUNT(*) AS cnt
     FROM mous m
     INNER JOIN partners p ON p.id = m.partner_id AND p.removed = false
     WHERE m.mou_end_date < NOW()
       AND m.removed = false ${scopeP}`,
    { type: QueryTypes.SELECT }
  );

  // ── Pipeline breakdown ────────────────────────────────────────────────────
  const allStages = [
    'new',
    'first_conversation',
    'interested',
    'interested_but_facing_delay',
    'not_interested',
    'dropped',
    'converted',
  ];
  const pipeline_by_stage = allStages.map((stage) => ({
    stage,
    count: byStage[stage] || 0,
  }));

  // ── Recent activity (last 10 stage transitions) ──────────────────────────
  const recentRows = await sequelize.query(
    `SELECT
       pa.conversion_stage,
       pa."createdAt" AS changed_at,
       p.partner_name,
       p.id AS partner_id,
       (SELECT u.user_display_name
        FROM partner_cos pc
        JOIN user_data u ON ROUND(u.user_id::NUMERIC)::INTEGER = pc.co_id
        WHERE pc.partner_id = pa.partner_id
        ORDER BY pc.id DESC
        LIMIT 1) AS changed_by
     FROM partner_agreements pa
     INNER JOIN partners p ON p.id = pa.partner_id AND p.removed = false
     WHERE pa.removed = false ${scopeP}
     ORDER BY pa."createdAt" DESC
     LIMIT 10`,
    { type: QueryTypes.SELECT }
  );

  return {
    total_leads,
    new_leads: byStage['new'] || 0,
    interested: (byStage['interested'] || 0) + (byStage['interested_but_facing_delay'] || 0),
    dropped_this_month: parseInt(droppedMonth?.cnt ?? 0),
    total_organizations,
    converted_this_month: parseInt(convertedMonth?.cnt ?? 0),
    active_mous: parseInt(activeMous?.cnt ?? 0),
    expiring_soon: parseInt(expiringSoon?.cnt ?? 0),
    expired: parseInt(expiredMous?.cnt ?? 0),
    pipeline_by_stage,
    recent_activity: recentRows.map((r) => ({
      partner_id: r.partner_id,
      partner_name: r.partner_name,
      conversion_stage: r.conversion_stage,
      changed_at: r.changed_at,
      changed_by: r.changed_by ?? 'Unknown',
    })),
  };
}

function _emptyMetrics() {
  return {
    total_leads: 0,
    new_leads: 0,
    interested: 0,
    dropped_this_month: 0,
    total_organizations: 0,
    converted_this_month: 0,
    active_mous: 0,
    expiring_soon: 0,
    expired: 0,
    pipeline_by_stage: [
      'new', 'first_conversation', 'interested',
      'interested_but_facing_delay', 'not_interested', 'dropped', 'converted',
    ].map((stage) => ({ stage, count: 0 })),
    recent_activity: [],
  };
}

module.exports = { getMetrics, resolvePartnerScope: _resolvePartnerScope };
