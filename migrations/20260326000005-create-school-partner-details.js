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

    const table = { schema, tableName: 'school_partner_details' };

    await queryInterface.createTable(table, {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      partner_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onDelete: 'CASCADE',
      },
      address_line_1: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address_line_2: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pincode: {
        // STRING not INTEGER — pincodes can have leading zeros
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      partner_affiliation_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      school_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      total_child_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      classes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      low_income_resource: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      interested: {
        type: Sequelize.BOOLEAN,
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

    await queryInterface.addIndex(table, ['partner_id']);

    // Copy existing school data from partners table
    await queryInterface.sequelize.query(`
      INSERT INTO ${schema}.school_partner_details (
        partner_id, address_line_1, address_line_2,
        pincode, partner_affiliation_type, school_type,
        total_child_count, classes, low_income_resource,
        interested, "createdAt", "updatedAt"
      )
      SELECT
        id,
        address_line_1,
        address_line_2,
        pincode::text,
        partner_affiliation_type,
        school_type,
        total_child_count,
        classes,
        low_income_resource,
        interested,
        NOW(),
        NOW()
      FROM ${schema}.partners
      WHERE entity_type = 'school'
        AND removed = false
    `);
  },

  async down(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    await queryInterface.dropTable({ schema, tableName: 'school_partner_details' });
  },
};
