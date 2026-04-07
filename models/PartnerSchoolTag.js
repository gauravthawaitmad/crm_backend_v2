const { Model, DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  class PartnerSchoolTag extends Model {
    static associate(models) {
      PartnerSchoolTag.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'sourcingPartner' });
      PartnerSchoolTag.belongsTo(models.Partner, { foreignKey: 'school_partner_id', as: 'schoolPartner' });
    }
  }
  PartnerSchoolTag.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    partner_id: { type: DataTypes.INTEGER, allowNull: false },
    school_partner_id: { type: DataTypes.INTEGER, allowNull: false },
    tagged_by: { type: DataTypes.STRING, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    sequelize,
    modelName: 'PartnerSchoolTag',
    tableName: 'partner_school_tags',
    timestamps: true,
  });
  return PartnerSchoolTag;
};
