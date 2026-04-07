const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PartnerComment extends Model {
    static associate(models) {
      if (models.Partner) {
        PartnerComment.belongsTo(models.Partner, {
          foreignKey: 'partner_id',
          as: 'partner',
        });
      }
      if (models.User) {
        PartnerComment.belongsTo(models.User, {
          foreignKey: 'user_id',
          targetKey: 'user_id',
          as: 'author',
        });
      }
    }
  }

  PartnerComment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      partner_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_edited: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      edited_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      removed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'PartnerComment',
      tableName: 'partner_comments',
      schema: process.env.DB_SCHEMA,
      timestamps: true,
    }
  );

  return PartnerComment;
};
