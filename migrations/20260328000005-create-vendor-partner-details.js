'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'vendor_partner_details' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      vendor_type: { type: Sequelize.STRING, allowNull: true },
      services_description: { type: Sequelize.TEXT, allowNull: true },
      contract_services: { type: Sequelize.TEXT, allowNull: true },
      contract_document: { type: Sequelize.STRING, allowNull: true },
      average_rating: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
      total_engagements: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'vendor_partner_details' });
  },
};
