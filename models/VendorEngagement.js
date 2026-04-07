const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class VendorEngagement extends Model {
    static associate(models) {
      VendorEngagement.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'vendor' });
      VendorEngagement.belongsTo(models.Partner, { foreignKey: 'school_partner_id', as: 'school' });
    }
  }
  VendorEngagement.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    engagement_name: { type: DataTypes.STRING, allowNull: false },
    school_partner_id: { type: DataTypes.INTEGER, allowNull: true },
    engagement_date: { type: DataTypes.DATE, allowNull: false },
    service_provided: { type: DataTypes.TEXT, allowNull: false },
    rating_overall: { type: DataTypes.INTEGER, allowNull: false },
    rating_quality: { type: DataTypes.INTEGER, allowNull: true },
    rating_timeliness: { type: DataTypes.INTEGER, allowNull: true },
    rating_cost: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'VendorEngagement',
    tableName: 'vendor_engagements',
    schema: 'mad_crm_dev',
    timestamps: true,
  });
  return VendorEngagement;
};
