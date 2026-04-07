const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class FunderPartnerDetail extends Model {
    static associate(models) {
      FunderPartnerDetail.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }
  FunderPartnerDetail.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    funder_type: { type: DataTypes.STRING, allowNull: true },
    website: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'FunderPartnerDetail',
    tableName: 'funder_partner_details',
    timestamps: true,
  });
  return FunderPartnerDetail;
};
