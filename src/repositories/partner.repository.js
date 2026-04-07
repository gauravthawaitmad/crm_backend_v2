/**
 * partner.repository.js
 *
 * Data-access layer for the `partners` table.
 * Only place that imports Sequelize models directly.
 * No business logic here — pure query construction.
 */

const {
  Partner,
  PartnerAgreement,
  PartnerCo,
  PocPartner,
  Poc,
  State,
  City,
  User,
  sequelize,
} = require('../../models');
const { Op, QueryTypes } = require('sequelize');
const { isCO } = require('../utils/roleUtils');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns partner IDs where the most recent agreement is 'converted'.
 * Used to exclude converted partners from the lead list.
 */
async function _getConvertedPartnerIds() {
  const rows = await sequelize.query(
    `SELECT partner_id
     FROM (
       SELECT DISTINCT ON (partner_id) partner_id, conversion_stage
       FROM partner_agreements
       WHERE removed = false
       ORDER BY partner_id, id DESC
     ) latest_ag
     WHERE latest_ag.conversion_stage = 'converted'`,
    { type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

/**
 * Returns partner IDs visible to a manager (via their COs in manager_co table).
 */
async function _getPartnerIdsForManager(managerId) {
  const rows = await sequelize.query(
    `SELECT DISTINCT pc.partner_id
     FROM partner_cos pc
     INNER JOIN manager_co mc ON mc.co_id = pc.co_id
     WHERE mc.manager_id = :managerId`,
    { replacements: { managerId: parseInt(managerId) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

/**
 * Returns partner IDs assigned to a CO (from partner_cos table).
 */
async function _getPartnerIdsForCO(userId) {
  const rows = await sequelize.query(
    `SELECT DISTINCT partner_id
     FROM partner_cos
     WHERE co_id = :userId`,
    { replacements: { userId: parseInt(userId) }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

/**
 * Batch-fetch the latest PartnerAgreement per partner for a set of partner IDs.
 * Returns a Map: partnerId → agreement object.
 */
async function _batchLatestAgreements(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON (partner_id) *
     FROM partner_agreements
     WHERE partner_id IN (:partnerIds) AND removed = false
     ORDER BY partner_id, id DESC`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Batch-fetch the latest PartnerCo (with CO user info) per partner.
 * Returns a Map: partnerId → { co_id, co: { user_display_name, user_role, ... } }
 */
async function _batchLatestCOs(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON (pc.partner_id)
       pc.partner_id,
       pc.co_id,
       pc."createdAt" as assigned_at,
       u.user_display_name,
       u.user_login,
       u.user_role
     FROM partner_cos pc
     LEFT JOIN user_data u ON ROUND(u.user_id::NUMERIC)::INTEGER = pc.co_id
     WHERE pc.partner_id IN (:partnerIds)
     ORDER BY pc.partner_id, pc.id DESC`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) =>
    map.set(r.partner_id, {
      co_id: r.co_id,
      assigned_at: r.assigned_at,
      co: {
        user_id: r.co_id,
        user_display_name: r.user_display_name,
        user_login: r.user_login,
        user_role: r.user_role,
      },
    })
  );
  return map;
}

/**
 * Batch-fetch the latest POC per partner.
 * Returns a Map: partnerId → poc object
 */
async function _batchLatestPOCs(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON (pp.partner_id)
       pp.partner_id,
       p.id as poc_id,
       p.poc_name,
       p.poc_designation,
       p.poc_contact::TEXT as poc_contact,
       p.poc_email,
       p.date_of_first_contact
     FROM poc_partners pp
     INNER JOIN pocs p ON p.id = pp.poc_id AND p.removed = false
     WHERE pp.partner_id IN (:partnerIds)
     ORDER BY pp.partner_id, pp.id DESC`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

// ── Exported methods ──────────────────────────────────────────────────────────

/**
 * Get a single partner by ID with full associations (for detail view).
 * @param {number} id
 * @param {string} [entityType] - if provided, returns null if entity_type doesn't match
 */
async function findById(id, entityType) {
  const where = { id, removed: false };
  if (entityType) where.entity_type = entityType;
  return Partner.findOne({
    where,
    include: [
      { model: State, as: 'state', attributes: ['id', 'state_name'] },
      { model: City, as: 'city', attributes: ['id', 'city_name'] },
      {
        model: PartnerAgreement,
        as: 'agreements',
        where: { removed: false },
        required: false,
        order: [['id', 'DESC']],
      },
      {
        model: PartnerCo,
        as: 'partnerCos',
        required: false,
        include: [
          {
            model: User,
            as: 'co',
            attributes: ['user_id', 'user_display_name', 'user_login', 'user_role', 'email'],
          },
        ],
        order: [['id', 'DESC']],
      },
      {
        model: PocPartner,
        as: 'pocPartners',
        required: false,
        include: [
          {
            model: Poc,
            as: 'poc',
            where: { removed: false },
            required: false,
          },
        ],
        order: [['id', 'DESC']],
      },
    ],
    order: [
      [{ model: PartnerAgreement, as: 'agreements' }, 'id', 'DESC'],
      [{ model: PartnerCo, as: 'partnerCos' }, 'id', 'DESC'],
      [{ model: PocPartner, as: 'pocPartners' }, 'id', 'DESC'],
    ],
  });
}

/**
 * Paginated list of partners with role-based visibility.
 *
 * @param {object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} params.userId
 * @param {string} params.userRole
 * @param {string} [params.entityType] - default 'school'. Filters by partners.entity_type.
 *   For 'school', also excludes converted partners (lead-list behaviour).
 * @returns {{ rows: object[], count: number }}
 */
async function findAll({ page = 1, limit = 20, search, userId, userRole, entityType = 'school', stage }) {
  const offset = (page - 1) * limit;

  // 1. For school type: get converted partner IDs to exclude (leads ≠ converted)
  let convertedIds = [];
  if (entityType === 'school') {
    convertedIds = await _getConvertedPartnerIds();
  }

  // 2. Determine role-based accessible partner IDs
  let rolePartnerIds = null; // null = no restriction (admin/super_admin sees all)

  if (userRole === 'manager') {
    rolePartnerIds = await _getPartnerIdsForManager(userId);
  } else if (isCO(userRole)) {
    rolePartnerIds = await _getPartnerIdsForCO(userId);
  }

  // 3. Build WHERE clause
  const where = { removed: false, entity_type: entityType };

  if (search) {
    where[Op.or] = [
      { partner_name: { [Op.iLike]: `%${search}%` } },
      { address_line_1: { [Op.iLike]: `%${search}%` } },
      { lead_source: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Stage filter: restrict to partners whose latest agreement matches the requested stage
  if (stage) {
    const safeStage = String(stage).replace(/[^a-z_]/gi, '');
    where[Op.and] = [
      sequelize.literal(
        `(SELECT conversion_stage FROM partner_agreements` +
        ` WHERE partner_id = "Partner"."id" AND removed = false` +
        ` ORDER BY id DESC LIMIT 1) = '${safeStage}'`
      ),
    ];
  }

  // 4. Combine role filter + (school-only) converted exclusion into the id condition
  if (rolePartnerIds !== null) {
    // Remove converted IDs from the accessible set
    const allowedIds =
      convertedIds.length
        ? rolePartnerIds.filter((id) => !convertedIds.includes(id))
        : rolePartnerIds;
    // If no accessible IDs, use sentinel that matches nothing
    where.id = { [Op.in]: allowedIds.length ? allowedIds : [0] };
  } else {
    // Admin: exclude converted (school only)
    if (convertedIds.length) {
      where.id = { [Op.notIn]: convertedIds };
    }
  }

  // 5. Main paginated query — just Partner + State + City (fast)
  const { count, rows } = await Partner.findAndCountAll({
    where,
    include: [
      { model: State, as: 'state', attributes: ['id', 'state_name'] },
      { model: City, as: 'city', attributes: ['id', 'city_name'] },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true,
  });

  if (!rows.length) return { rows: [], count: 0 };

  // 6. Batch-fetch latest agreements, COs, POCs for the returned partners
  const partnerIds = rows.map((p) => p.id);
  const [agreementsMap, cosMap, pocsMap] = await Promise.all([
    _batchLatestAgreements(partnerIds),
    _batchLatestCOs(partnerIds),
    _batchLatestPOCs(partnerIds),
  ]);

  // 7. Assemble enriched result
  const enriched = rows.map((partner) => {
    const p = partner.toJSON();
    p.latestAgreement = agreementsMap.get(p.id) || null;
    p.latestCo = cosMap.get(p.id) || null;
    p.latestPoc = pocsMap.get(p.id) || null;
    return p;
  });

  return { rows: enriched, count };
}

/**
 * Create a new Partner record.
 * @param {object} data - Partner fields
 * @param {object} [transaction] - Sequelize transaction
 */
async function create(data, transaction) {
  return Partner.create(data, transaction ? { transaction } : {});
}

/**
 * Update Partner fields by ID.
 * @param {number} id
 * @param {object} data
 * @param {object} [transaction]
 */
async function update(id, data, transaction) {
  const [, [updated]] = await Partner.update(data, {
    where: { id },
    returning: true,
    ...(transaction ? { transaction } : {}),
  });
  return updated;
}

/**
 * Soft-delete a partner by setting removed = true.
 * @param {number} id
 */
async function softDelete(id) {
  await Partner.update({ removed: true }, { where: { id } });
}

module.exports = {
  findById,
  findAll,
  create,
  update,
  softDelete,
};
