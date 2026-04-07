const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class FunderDeliverable extends Model {
    static associate(models) {
      FunderDeliverable.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
      FunderDeliverable.belongsTo(models.PartnerCommitment, { foreignKey: 'commitment_id', as: 'commitment' });
    }
  }
  FunderDeliverable.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    commitment_id: { type: DataTypes.INTEGER, allowNull: false },
    deliverable_type: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    due_date: { type: DataTypes.DATEONLY, allowNull: false },
    delivered_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    document_url: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'FunderDeliverable',
    tableName: 'funder_deliverables',
    timestamps: true,
  });
  return FunderDeliverable;
};
