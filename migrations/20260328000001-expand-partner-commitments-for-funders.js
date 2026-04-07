'use strict';
const schema = 'mad_crm_dev';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'commitment_type', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'amount_description', {
      type: Sequelize.TEXT, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'amount', {
      type: Sequelize.DECIMAL(12, 2), allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'amount_per_installment', {
      type: Sequelize.DECIMAL(12, 2), allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'installment_frequency', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'total_installments', {
      type: Sequelize.INTEGER, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'received_installments', {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'program_name', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'proposal_document', {
      type: Sequelize.STRING, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'proposal_submitted_date', {
      type: Sequelize.DATEONLY, allowNull: true,
    });
    await queryInterface.addColumn({ schema, tableName: 'partner_commitments' }, 'renewal_flag', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });
  },
  async down(queryInterface) {
    const cols = [
      'commitment_type', 'amount_description', 'amount', 'amount_per_installment',
      'installment_frequency', 'total_installments', 'received_installments',
      'program_name', 'proposal_document', 'proposal_submitted_date', 'renewal_flag',
    ];
    for (const col of cols) {
      await queryInterface.removeColumn({ schema, tableName: 'partner_commitments' }, col);
    }
  },
};
