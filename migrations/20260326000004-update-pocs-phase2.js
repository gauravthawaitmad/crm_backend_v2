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

    const table = { schema, tableName: 'pocs' };

    // poc_contact: ensure VARCHAR(20) — DB is already varchar from earlier fix,
    // but this makes the schema explicit and adds the length constraint
    await queryInterface.changeColumn(table, 'poc_contact', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    // Make poc_designation nullable
    await queryInterface.changeColumn(table, 'poc_designation', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Make poc_email nullable
    await queryInterface.changeColumn(table, 'poc_email', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Add is_primary flag
    await queryInterface.addColumn(table, 'is_primary', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    const table = { schema, tableName: 'pocs' };

    await queryInterface.removeColumn(table, 'is_primary');

    await queryInterface.changeColumn(table, 'poc_email', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn(table, 'poc_designation', {
      type: Sequelize.STRING,
      allowNull: false,
    });

    await queryInterface.changeColumn(table, 'poc_contact', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
