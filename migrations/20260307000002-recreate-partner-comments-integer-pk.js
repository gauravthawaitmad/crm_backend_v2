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

    const table = { schema, tableName: 'partner_comments' };

    // Drop the UUID version created by the previous migration
    await queryInterface.dropTable(table);

    // Recreate with INTEGER auto-increment PK (consistent with all other tables)
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
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        // No FK — user_data.user_id is external-sync, no PG-recognised PK constraint
      },
      comment_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      is_edited: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      edited_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex(table, ['user_id']);
  },

  async down(queryInterface, Sequelize) {
    const env = process.env.NODE_ENV || 'development';
    const schema =
      process.env.DB_SCHEMA ||
      (env === 'production' ? 'prod'
       : env === 'staging'  ? 'mad_crm_staging'
       : env === 'test'     ? 'mad_crm_test'
       :                      'mad_crm_dev');

    await queryInterface.dropTable({ schema, tableName: 'partner_comments' });
  },
};
