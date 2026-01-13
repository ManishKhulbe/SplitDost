const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging
  }
);

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Group = require('./Group')(sequelize, Sequelize.DataTypes);
const GroupMember = require('./GroupMember')(sequelize, Sequelize.DataTypes);
const Expense = require('./Expense')(sequelize, Sequelize.DataTypes);
const ExpenseSplit = require('./ExpenseSplit')(sequelize, Sequelize.DataTypes);

// Define associations
User.hasMany(Group, { foreignKey: 'createdBy', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId', as: 'groups' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId', as: 'members' });

Group.hasMany(Expense, { foreignKey: 'groupId', as: 'expenses' });
Expense.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });

User.hasMany(Expense, { foreignKey: 'paidBy', as: 'paidExpenses' });
Expense.belongsTo(User, { foreignKey: 'paidBy', as: 'payer' });

Expense.hasMany(ExpenseSplit, { foreignKey: 'expenseId', as: 'splits' });
ExpenseSplit.belongsTo(Expense, { foreignKey: 'expenseId', as: 'expense' });

User.hasMany(ExpenseSplit, { foreignKey: 'userId', as: 'expenseSplits' });
ExpenseSplit.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const db = {
  sequelize,
  Sequelize,
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit
};

module.exports = db;

