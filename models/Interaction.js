const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Interaction extends Model {
    static associate(models) {
      Interaction.belongsTo(models.Partner, { foreignKey: 'partner_id', as: 'partner' });
      Interaction.belongsTo(models.Poc, { foreignKey: 'poc_id', as: 'poc' });
    }
  }

  Interaction.init(
    {
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'partners', key: 'id' },
      },
      poc_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'pocs', key: 'id' },
      },
      // Call / In-Person Meeting / Site Visit / Online Meeting / Email / WhatsApp
      interaction_type: { type: DataTypes.STRING, allowNull: false },
      interaction_date: { type: DataTypes.DATEONLY, allowNull: false },
      duration_mins: { type: DataTypes.INTEGER, allowNull: true },
      location: { type: DataTypes.STRING, allowNull: true },
      // user_id from user_data (no FK — external sync)
      conducted_by: { type: DataTypes.STRING, allowNull: false },
      attendees_notes: { type: DataTypes.TEXT, allowNull: true },
      summary: { type: DataTypes.TEXT, allowNull: false },
      // Positive / Neutral / Needs Follow-up / No Response
      outcome: { type: DataTypes.STRING, allowNull: false },
      next_steps: { type: DataTypes.TEXT, allowNull: true },
      follow_up_date: { type: DataTypes.DATEONLY, allowNull: true },
      // user_id from user_data (no FK — external sync)
      follow_up_assigned_to: { type: DataTypes.STRING, allowNull: true },
      follow_up_done: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      follow_up_done_at: { type: DataTypes.DATEONLY, allowNull: true },
      removed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Interaction',
      tableName: 'interactions',
      timestamps: true,
    }
  );

  return Interaction;
};
