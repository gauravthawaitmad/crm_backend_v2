const { Op } = require('sequelize');
const { State, City, User, sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

const CO_ROLES = ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'];

const referenceRepository = {
  async getStates() {
    return State.findAll({
      attributes: ['id', 'state_name'],
      order: [['state_name', 'ASC']],
    });
  },

  async getCities(stateId) {
    return City.findAll({
      attributes: ['id', 'city_name'],
      where: { state_id: stateId },
      order: [['city_name', 'ASC']],
    });
  },

  async getCOUsers() {
    return User.findAll({
      attributes: ['user_id', 'user_display_name', 'user_role'],
      where: {
        user_role: { [Op.in]: CO_ROLES },
      },
      order: [['user_display_name', 'ASC']],
    });
  },

  async getSchools(search) {
    const searchClause = search
      ? `AND p.partner_name ILIKE :search`
      : '';
    return sequelize.query(
      `SELECT p.id, p.partner_name, c.city_name
       FROM mad_crm_dev.partners p
       LEFT JOIN mad_crm_dev.cities c ON c.id = p.city_id
       WHERE p.entity_type = 'school' AND p.removed = false
       ${searchClause}
       ORDER BY p.partner_name ASC
       LIMIT 20`,
      {
        replacements: search ? { search: `%${search}%` } : {},
        type: QueryTypes.SELECT,
      }
    );
  },
};

module.exports = referenceRepository;
