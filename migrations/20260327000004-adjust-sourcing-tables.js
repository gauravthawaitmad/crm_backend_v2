'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add spec columns to sourcing_partner_details
    await queryInterface.addColumn(
      { schema, tableName: 'sourcing_partner_details' },
      'organization_type', { type: Sequelize.STRING, allowNull: true }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'sourcing_partner_details' },
      'volunteers_committed', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'sourcing_partner_details' },
      'volunteers_deployed', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    );
    // Add spec columns to partner_commitments
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'entity_type', { type: Sequelize.STRING, allowNull: false, defaultValue: 'sourcing' }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'cycle_label', { type: Sequelize.STRING, allowNull: true }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'delivered_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'start_date', { type: Sequelize.DATEONLY, allowNull: true }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'end_date', { type: Sequelize.DATEONLY, allowNull: true }
    );
    await queryInterface.addColumn(
      { schema, tableName: 'partner_commitments' },
      'document_url', { type: Sequelize.STRING, allowNull: true }
    );
  },
  async down(queryInterface) {
    const tbl1 = { schema, tableName: 'sourcing_partner_details' };
    await queryInterface.removeColumn(tbl1, 'organization_type');
    await queryInterface.removeColumn(tbl1, 'volunteers_committed');
    await queryInterface.removeColumn(tbl1, 'volunteers_deployed');
    const tbl2 = { schema, tableName: 'partner_commitments' };
    await queryInterface.removeColumn(tbl2, 'entity_type');
    await queryInterface.removeColumn(tbl2, 'cycle_label');
    await queryInterface.removeColumn(tbl2, 'delivered_count');
    await queryInterface.removeColumn(tbl2, 'start_date');
    await queryInterface.removeColumn(tbl2, 'end_date');
    await queryInterface.removeColumn(tbl2, 'document_url');
  },
};
