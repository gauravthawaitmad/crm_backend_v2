const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class VendorPartnerDetail extends Model {
    static associate(models) {
      VendorPartnerDetail.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }
  VendorPartnerDetail.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    vendor_type: { type: DataTypes.STRING, allowNull: true },
    services_description: { type: DataTypes.TEXT, allowNull: true },
    contract_services: { type: DataTypes.TEXT, allowNull: true },
    contract_document: { type: DataTypes.STRING, allowNull: true },
    average_rating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
    total_engagements: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    sequelize,
    modelName: 'VendorPartnerDetail',
    tableName: 'vendor_partner_details',
    schema: 'mad_crm_dev',
    timestamps: true,
  });
  return VendorPartnerDetail;
};
