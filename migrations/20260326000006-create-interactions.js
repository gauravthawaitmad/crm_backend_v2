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

    const table = { schema, tableName: 'interactions' };

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
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onDelete: 'CASCADE',
      },
      poc_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: { schema, tableName: 'pocs' }, key: 'id' },
        onDelete: 'SET NULL',
      },
      // Call / In-Person Meeting / Site Visit / Online Meeting / Email / WhatsApp
      interaction_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      interaction_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      duration_mins: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      // user_id from user_data — stored as STRING, no FK (external sync)
      conducted_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      attendees_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // Positive / Neutral / Needs Follow-up / No Response
      outcome: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      next_steps: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      follow_up_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      // user_id from user_data — stored as STRING, no FK
      follow_up_assigned_to: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      follow_up_done: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      follow_up_done_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      removed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
    await queryInterface.addIndex(table, ['poc_id']);
    await queryInterface.addIndex(table, ['conducted_by']);
    await queryInterface.addIndex(table, ['follow_up_date']);

    // Migrate existing meetings data
    await queryInterface.sequelize.query(`
      INSERT INTO ${schema}.interactions (
        partner_id, poc_id, conducted_by,
        interaction_type, interaction_date,
        summary, outcome, follow_up_done,
        removed, "createdAt", "updatedAt"
      )
      SELECT
        partner_id,
        poc_id,
        user_id::text,
        'In-Person Meeting',
        COALESCE(meeting_date::date, "createdAt"::date),
        COALESCE(meeting_notes, 'Meeting logged'),
        'Neutral',
        false,
        false,
        "createdAt",
        "updatedAt"
      FROM ${schema}.meetings
      WHERE partner_id IS NOT NULL
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

    await queryInterface.dropTable({ schema, tableName: 'interactions' });
  },
};
