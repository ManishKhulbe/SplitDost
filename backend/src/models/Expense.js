module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR',
      validate: {
        isIn: [['INR', 'USD', 'EUR', 'GBP']]
      }
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paidBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    splitType: {
      type: DataTypes.ENUM('equal', 'exact'),
      allowNull: false,
      defaultValue: 'equal'
    },
    isPersonal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'expenses',
    indexes: [
      {
        fields: ['paidBy']
      },
      {
        fields: ['groupId']
      },
      {
        fields: ['date']
      },
      {
        fields: ['isPersonal']
      }
    ]
  });

  return Expense;
};

