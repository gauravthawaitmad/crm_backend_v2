'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'funder_partner_details' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      funder_type: { type: Sequelize.STRING, allowNull: true },
      website: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'funder_partner_details' });
  },
};
