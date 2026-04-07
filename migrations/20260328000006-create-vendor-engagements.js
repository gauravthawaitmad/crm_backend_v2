'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'vendor_engagements' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      engagement_name: { type: Sequelize.STRING, allowNull: false },
      school_partner_id: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      engagement_date: { type: Sequelize.DATE, allowNull: false },
      service_provided: { type: Sequelize.TEXT, allowNull: false },
      rating_overall: { type: Sequelize.INTEGER, allowNull: false },
      rating_quality: { type: Sequelize.INTEGER, allowNull: true },
      rating_timeliness: { type: Sequelize.INTEGER, allowNull: true },
      rating_cost: { type: Sequelize.INTEGER, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      removed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'vendor_engagements' });
  },
};
