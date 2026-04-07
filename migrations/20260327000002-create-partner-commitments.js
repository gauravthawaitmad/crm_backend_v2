'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'partner_commitments' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: { type: Sequelize.INTEGER, allowNull: false,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      cycle_year: { type: Sequelize.INTEGER, allowNull: false },
      committed_count: { type: Sequelize.INTEGER, allowNull: true },
      actual_count: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      commitment_notes: { type: Sequelize.TEXT, allowNull: true },
      removed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'partner_commitments' });
  },
};
