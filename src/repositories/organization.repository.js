/**
 * organization.repository.js
 *
 * Data-access layer for Organizations (Partners where latest agreement = 'converted').
 * Same `partners` table as leads — filtered by conversion stage.
 */

const {
  Partner,
  PartnerAgreement,
  PartnerCo,
  Mou,
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
 * This is the inclusion filter for the organization list (opposite of leads).
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
 * Returns partner IDs visible to a manager (via manager_co table).
 */
async function _getPartnerIdsForManager(managerId) {
  const rows = await sequelize.query(
    `SELECT DISTINCT pc.partner_id
     FROM partner_cos pc
     INNER JOIN manager_co mc ON mc.co_id::NUMERIC = pc.co_id::NUMERIC
     WHERE mc.manager_id::NUMERIC = :managerId::NUMERIC`,
    { replacements: { managerId }, type: QueryTypes.SELECT }
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
     WHERE co_id::NUMERIC = :userId::NUMERIC`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );
  return rows.map((r) => r.partner_id);
}

/**
 * Batch-fetch the active MOU per partner for a list of partner IDs.
 * Returns a Map: partnerId → mou object
 */
async function _batchActiveMous(partnerIds) {
  if (!partnerIds.length) return new Map();
  const rows = await sequelize.query(
    `SELECT DISTINCT ON (partner_id) *
     FROM mous
     WHERE partner_id IN (:partnerIds)
       AND removed = false
       AND mou_status = 'active'
     ORDER BY partner_id, id DESC`,
    { replacements: { partnerIds }, type: QueryTypes.SELECT }
  );
  const map = new Map();
  rows.forEach((r) => map.set(r.partner_id, r));
  return map;
}

/**
 * Batch-fetch the latest PartnerCo (with CO user info) per partner.
 * Returns a Map: partnerId → { co_id, co: { ... } }
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
     LEFT JOIN user_data u ON u.user_id::NUMERIC = pc.co_id
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

// ── Exported methods ──────────────────────────────────────────────────────────

/**
 * Get a single Organization by ID with full associations.
 * @param {number} id
 */
async function findById(id) {
  return Partner.findOne({
    where: { id, removed: false },
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
      },
      {
        model: Mou,
        as: 'mous',
        required: false,
        order: [['id', 'DESC']],
      },
    ],
    order: [
      [{ model: PartnerAgreement, as: 'agreements' }, 'id', 'DESC'],
      [{ model: PartnerCo, as: 'partnerCos' }, 'id', 'DESC'],
      [{ model: Mou, as: 'mous' }, 'id', 'DESC'],
    ],
  });
}

/**
 * Paginated list of Organizations with role-based visibility.
 *
 * @param {object} params
 * @param {number} params.page
 * @param {number} params.limit
 * @param {string} [params.search]
 * @param {string} params.userId
 * @param {string} params.userRole
 * @returns {{ rows: object[], count: number }}
 */
async function findAll({ page = 1, limit = 20, search, userId, userRole }) {
  const offset = (page - 1) * limit;

  // 1. Get partner IDs where latest agreement = 'converted' (inclusion list)
  const convertedIds = await _getConvertedPartnerIds();

  if (!convertedIds.length) return { rows: [], count: 0 };

  // 2. Role-based accessible partner IDs
  let rolePartnerIds = null; // null = admin/super_admin (no restriction)

  if (userRole === 'manager') {
    rolePartnerIds = await _getPartnerIdsForManager(userId);
  } else if (isCO(userRole)) {
    rolePartnerIds = await _getPartnerIdsForCO(userId);
  }

  // 3. Build WHERE
  const where = { removed: false };

  if (search) {
    where[Op.or] = [
      { partner_name: { [Op.iLike]: `%${search}%` } },
      { address_line_1: { [Op.iLike]: `%${search}%` } },
      { lead_source: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // 4. Intersect role-accessible IDs with converted IDs
  if (rolePartnerIds !== null) {
    const allowedIds = rolePartnerIds.filter((id) => convertedIds.includes(id));
    where.id = { [Op.in]: allowedIds.length ? allowedIds : [0] };
  } else {
    // Admin — include all converted
    where.id = { [Op.in]: convertedIds };
  }

  // 5. Paginated query — Partner + State + City
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

  // 6. Batch-fetch active MOUs and latest COs
  const partnerIds = rows.map((p) => p.id);
  const [mousMap, cosMap] = await Promise.all([
    _batchActiveMous(partnerIds),
    _batchLatestCOs(partnerIds),
  ]);

  // 7. Assemble enriched result
  const enriched = rows.map((partner) => {
    const p = partner.toJSON();
    p.activeMou = mousMap.get(p.id) || null;
    p.latestCo = cosMap.get(p.id) || null;
    return p;
  });

  return { rows: enriched, count };
}

/**
 * Soft-delete an organization and deactivate all its active MOUs.
 * @param {number} id
 * @param {object} [transaction]
 */
async function softDelete(id, transaction) {
  const opts = transaction ? { transaction } : {};
  await Partner.update({ removed: true }, { where: { id }, ...opts });
  await Mou.update(
    { removed: true, mou_status: 'inactive' },
    { where: { partner_id: id, removed: false }, ...opts }
  );
}

module.exports = { findById, findAll, softDelete };
