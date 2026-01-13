module.exports = (sequelize, DataTypes) => {
  const ExpenseSplit = sequelize.define('ExpenseSplit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'expense_splits',
    indexes: [
      {
        fields: ['expenseId']
      },
      {
        fields: ['userId']
      },
      {
        unique: true,
        fields: ['expenseId', 'userId']
      }
    ]
  });

  return ExpenseSplit;
};

