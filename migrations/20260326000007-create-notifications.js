'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    const table = { schema, tableName: 'notifications' };

    await queryInterface.createTable(table, {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      // user_id from user_data — stored as STRING, no FK (external sync)
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      // follow_up_due / stage_change / mou_expiry / commitment_expiry
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onDelete: 'SET NULL',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      read_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex(table, ['user_id']);
    await queryInterface.addIndex(table, ['partner_id']);
    await queryInterface.addIndex(table, ['read']);
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    await queryInterface.dropTable({ schema, tableName: 'notifications' });
  },
};
