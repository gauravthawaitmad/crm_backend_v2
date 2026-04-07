'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'sourcing_partner_details' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: { type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      org_type: { type: Sequelize.STRING, allowNull: true },
      website: { type: Sequelize.STRING, allowNull: true },
      volunteer_capacity: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      removed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'sourcing_partner_details' });
  },
};
