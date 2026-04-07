'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn({ schema, tableName: 'partner_commitments' }, 'cycle_year', {
      type: Sequelize.INTEGER, allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    // Update nulls to 0 before re-adding NOT NULL constraint
    await queryInterface.sequelize.query(
      `UPDATE ${schema}.partner_commitments SET cycle_year = 0 WHERE cycle_year IS NULL`
    );
    await queryInterface.changeColumn({ schema, tableName: 'partner_commitments' }, 'cycle_year', {
      type: Sequelize.INTEGER, allowNull: false,
    });
  },
};
