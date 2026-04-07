const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class PartnerCommitment extends Model {
    static associate(models) {
      PartnerCommitment.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }
  PartnerCommitment.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    cycle_year: { type: DataTypes.INTEGER, allowNull: true },
    cycle_label: { type: DataTypes.STRING, allowNull: true },
    committed_count: { type: DataTypes.INTEGER, allowNull: true },
    delivered_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    actual_count: { type: DataTypes.INTEGER, allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: true },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    entity_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'sourcing' },
    commitment_notes: { type: DataTypes.TEXT, allowNull: true },
    document_url: { type: DataTypes.STRING, allowNull: true },
    // Funder-specific fields
    commitment_type: { type: DataTypes.STRING, allowNull: true },
    amount_description: { type: DataTypes.TEXT, allowNull: true },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    amount_per_installment: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    installment_frequency: { type: DataTypes.STRING, allowNull: true },
    total_installments: { type: DataTypes.INTEGER, allowNull: true },
    received_installments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    program_name: { type: DataTypes.STRING, allowNull: true },
    proposal_document: { type: DataTypes.STRING, allowNull: true },
    proposal_submitted_date: { type: DataTypes.DATEONLY, allowNull: true },
    renewal_flag: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'PartnerCommitment',
    tableName: 'partner_commitments',
    timestamps: true,
  });
  return PartnerCommitment;
};
