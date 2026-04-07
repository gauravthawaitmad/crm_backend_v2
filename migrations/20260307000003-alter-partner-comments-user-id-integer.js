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

    // Drop existing index on user_id before altering column type
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "${schema}"."partner_comments_user_id"`
    );

    // ALTER user_id from VARCHAR → INTEGER
    // Existing values may be stored as decimal strings (e.g. "1924598.000000000")
    // so we go through NUMERIC first, then round to INTEGER
    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."partner_comments"
       ALTER COLUMN user_id TYPE INTEGER USING ROUND(user_id::NUMERIC)::INTEGER`
    );

    // Recreate index
    await queryInterface.addIndex(
      { schema, tableName: 'partner_comments' },
      ['user_id']
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

    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS "${schema}"."partner_comments_user_id"`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."partner_comments"
       ALTER COLUMN user_id TYPE VARCHAR USING user_id::VARCHAR`
    );

    await queryInterface.addIndex(
      { schema, tableName: 'partner_comments' },
      ['user_id']
    );
  },
};
