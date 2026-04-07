const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class SourcingPartnerDetail extends Model {
    static associate(models) {
      SourcingPartnerDetail.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }
  SourcingPartnerDetail.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    org_type: { type: DataTypes.STRING, allowNull: true },
    organization_type: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    volunteer_capacity: { type: DataTypes.INTEGER, allowNull: true },
    volunteers_committed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    volunteers_deployed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    notes: { type: DataTypes.TEXT, allowNull: true },
    removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'SourcingPartnerDetail',
    tableName: 'sourcing_partner_details',
    timestamps: true,
  });
  return SourcingPartnerDetail;
};
