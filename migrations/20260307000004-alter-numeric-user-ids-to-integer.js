'use strict';

/**
 * Converts numeric/decimal user_id fields to INTEGER:
 *   - meetings.user_id   (was DECIMAL/NUMERIC)
 *   - partner_cos.co_id  (was DECIMAL/NUMERIC)
 *
 * Uses ROUND(x::NUMERIC)::INTEGER to safely cast both INTEGER
 * and DECIMAL values without conversion errors.
 */
module.exports = {
  async up(queryInterface) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    // meetings.user_id
    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."meetings"
       ALTER COLUMN user_id TYPE INTEGER USING ROUND(user_id::NUMERIC)::INTEGER`
    );

    // partner_cos.co_id
    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."partner_cos"
       ALTER COLUMN co_id TYPE INTEGER USING ROUND(co_id::NUMERIC)::INTEGER`
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
      `ALTER TABLE "${schema}"."meetings"
       ALTER COLUMN user_id TYPE NUMERIC USING user_id::NUMERIC`
    );

    await queryInterface.sequelize.query(
      `ALTER TABLE "${schema}"."partner_cos"
       ALTER COLUMN co_id TYPE NUMERIC USING co_id::NUMERIC`
    );
  },
};
