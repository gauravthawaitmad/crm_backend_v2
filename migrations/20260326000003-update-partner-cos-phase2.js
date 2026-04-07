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

    const table = { schema, tableName: 'partner_cos' };

    await queryInterface.addColumn(table, 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn(table, 'assigned_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn(table, 'removed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Backfill existing rows
    await queryInterface.sequelize.query(
      `UPDATE ${schema}.partner_cos SET is_active = true, assigned_by = co_id::text WHERE is_active IS NULL`
    );
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    const table = { schema, tableName: 'partner_cos' };

    await queryInterface.removeColumn(table, 'removed_at');
    await queryInterface.removeColumn(table, 'assigned_by');
    await queryInterface.removeColumn(table, 'is_active');
  },
};
