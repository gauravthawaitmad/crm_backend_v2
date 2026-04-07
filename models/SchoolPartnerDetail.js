const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SchoolPartnerDetail extends Model {
    static associate(models) {
      SchoolPartnerDetail.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  SchoolPartnerDetail.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'partners', key: 'id' },
      },
      address_line_1: { type: DataTypes.STRING, allowNull: true },
      address_line_2: { type: DataTypes.STRING, allowNull: true },
      pincode: { type: DataTypes.STRING(10), allowNull: true },
      partner_affiliation_type: { type: DataTypes.STRING, allowNull: true },
      school_type: { type: DataTypes.STRING, allowNull: true },
      total_child_count: { type: DataTypes.INTEGER, allowNull: true },
      classes: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
      low_income_resource: { type: DataTypes.BOOLEAN, allowNull: true },
      interested: { type: DataTypes.BOOLEAN, allowNull: true },
    },
    {
      sequelize,
      modelName: 'SchoolPartnerDetail',
      tableName: 'school_partner_details',
      timestamps: true,
    }
  );

  return SchoolPartnerDetail;
};
