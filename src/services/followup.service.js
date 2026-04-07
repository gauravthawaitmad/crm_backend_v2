'use strict';

/**
 * followup.service.js
 *
 * Aggregates pending follow-ups for the current user.
 * Uses same RBAC scope resolution as the dashboard service.
 */

const { sequelize }   = require('../../models');
const { QueryTypes }  = require('sequelize');
const interactionRepo = require('../repositories/interaction.repository');
const { isCO, isAdmin } = require('../utils/roleUtils');

// ── Scope resolution (same pattern as dashboard.service) ──────────────────────

async function _resolvePartnerScope(userId, userRole) {
  if (isAdmin(userRole)) return null; // all partners

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

  // CO roles — own assignments only
  const rows = await sequelize.query(
    `SELECT DISTINCT partner_id FROM partner_cos WHERE co_id = :userId`,
    { replacements: { userId: parseInt(userId) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Get all pending follow-ups for the current user, grouped by urgency.
 *
 * @param {string} userId
 * @param {string} userRole
 * @returns {{ overdue, today, this_week, total_count }}
 */
async function getFollowUpsDue(userId, userRole) {
  const partnerIds = await _resolvePartnerScope(userId, userRole);

  const grouped = await interactionRepo.getFollowUpsDue(String(userId), partnerIds);

  // Add partner_url for frontend navigation
  const addUrl = (item) => ({
    ...item,
    partner_url: `/partnerships/${item.entity_type}/${item.partner_id}`,
  });

  return {
    overdue:     grouped.overdue.map(addUrl),
    today:       grouped.today.map(addUrl),
    this_week:   grouped.this_week.map(addUrl),
    total_count: grouped.total_count,
  };
}

module.exports = { getFollowUpsDue };
