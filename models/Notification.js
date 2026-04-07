const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
    }
  }

  Notification.init(
    {
      // user_id from user_data (no FK — external sync)
      user_id: { type: DataTypes.STRING, allowNull: false },
      // follow_up_due / stage_change / mou_expiry / commitment_expiry
      type: { type: DataTypes.STRING, allowNull: false },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'partners', key: 'id' },
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: DataTypes.DATEONLY, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'notifications',
      timestamps: true,
    }
  );

  return Notification;
};
