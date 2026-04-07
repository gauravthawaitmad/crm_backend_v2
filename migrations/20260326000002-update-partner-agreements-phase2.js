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

    const table = { schema, tableName: 'partner_agreements' };

    await queryInterface.addColumn(table, 'changed_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(table, 'extra_data', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    const table = { schema, tableName: 'partner_agreements' };

    await queryInterface.removeColumn(table, 'extra_data');
    await queryInterface.removeColumn(table, 'changed_by');
  },
};
