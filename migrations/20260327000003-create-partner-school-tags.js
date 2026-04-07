'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema, tableName: 'partner_school_tags' }, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      partner_id: { type: Sequelize.INTEGER, allowNull: false,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      school_partner_id: { type: Sequelize.INTEGER, allowNull: false,
        references: { model: { schema, tableName: 'partners' }, key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      tagged_by: { type: Sequelize.STRING, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      removed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex(
      { schema, tableName: 'partner_school_tags' },
      ['partner_id', 'school_partner_id'],
      { unique: true, name: 'partner_school_tags_unique' }
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable({ schema, tableName: 'partner_school_tags' });
  },
};
