const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Partner extends Model {
    static associate(models) {
    //   console.log('Associating Partner with:', Object.keys(models)); // ✅ Debugging line

      if (!models.User || !models.State || !models.City) {
        throw new Error('Missing required models for Partner associations.');
      }

      Partner.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
      Partner.belongsTo(models.State, { foreignKey: 'state_id', as: 'state' });
      Partner.belongsTo(models.City, { foreignKey: 'city_id', as: 'city' });

      if (models.PartnerAgreement) {
        Partner.hasMany(models.PartnerAgreement, { foreignKey: 'partner_id', as: 'agreements' });
      }
      if (models.PartnerCo) {
        Partner.hasMany(models.PartnerCo, { foreignKey: 'partner_id', as: 'partnerCos' });
      }
      if (models.Poc) {
        Partner.hasMany(models.Poc, { foreignKey: 'partner_id', as: 'pocs' });
      }
      if (models.PocPartner) {
        Partner.hasMany(models.PocPartner, { foreignKey: 'partner_id', as: 'pocPartners' });
      }
      if (models.Meeting) {
        Partner.hasMany(models.Meeting, { foreignKey: 'partner_id', as: 'meetings' });
      }
      if (models.Mou) {
        Partner.hasMany(models.Mou, { foreignKey: 'partner_id', as: 'mous' });
      }
      if (models.SchoolPartnerDetail) {
        Partner.hasOne(models.SchoolPartnerDetail, { foreignKey: 'partner_id', as: 'schoolDetail' });
      }
      if (models.Interaction) {
        Partner.hasMany(models.Interaction, { foreignKey: 'partner_id', as: 'interactions' });
      }
      if (models.Notification) {
        Partner.hasMany(models.Notification, { foreignKey: 'partner_id', as: 'notifications' });
      }
      if (models.SourcingPartnerDetail) {
        Partner.hasOne(models.SourcingPartnerDetail, { foreignKey: 'partner_id', as: 'sourcingDetail' });
      }
      if (models.PartnerCommitment) {
        Partner.hasMany(models.PartnerCommitment, { foreignKey: 'partner_id', as: 'commitments' });
      }
      if (models.PartnerSchoolTag) {
        Partner.hasMany(models.PartnerSchoolTag, { foreignKey: 'partner_id', as: 'schoolTags' });
      }
    }
  }

  Partner.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      created_by: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
      state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      city_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      partner_name: { type: DataTypes.STRING, allowNull: false },
      address_line_1: { type: DataTypes.STRING, allowNull: false },
      address_line_2: { type: DataTypes.STRING, allowNull: true },
      pincode: { type: DataTypes.INTEGER, allowNull: false },
      partner_affiliation_type: { type: DataTypes.STRING, allowNull: true },
      school_type: { type: DataTypes.STRING, allowNull: true },
      total_child_count: { type: DataTypes.INTEGER, allowNull: true },
      lead_source: { type: DataTypes.STRING, allowNull: false },
      classes: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
      low_income_resource: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
      interested: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
      entity_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'school' },
      removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Partner',
      tableName: 'partners',
      timestamps: true,
    }
  );

  return Partner;
};
