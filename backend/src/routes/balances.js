const express = require('express');
const { Group, Expense, ExpenseSplit, User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Calculate balances for a group
 * Returns how much each user owes or is owed
 */
const calculateGroupBalances = async (groupId, userId = null) => {
  // Get all expenses for the group
  const expenses = await Expense.findAll({
    where: { groupId },
    include: [
      {
        model: ExpenseSplit,
        as: 'splits',
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }]
      },
      {
        model: User,
        as: 'payer',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  // Initialize balance map: userId -> { owes: amount, owed: amount }
  const balances = {};

  for (const expense of expenses) {
    const payerId = expense.paidBy;
    const currency = expense.currency;

    // Initialize payer if not exists
    if (!balances[payerId]) {
      balances[payerId] = { owes: 0, owed: 0, currency };
    }

    // Add to "owed" for the payer (they paid, so others owe them)
    balances[payerId].owed += parseFloat(expense.amount);

    // Process splits
    for (const split of expense.splits) {
      const splitUserId = split.userId;
      const splitAmount = parseFloat(split.amount);

      // Initialize user if not exists
      if (!balances[splitUserId]) {
        balances[splitUserId] = { owes: 0, owed: 0, currency };
      }

      // Add to "owes" for the split user
      balances[splitUserId].owes += splitAmount;

      // If this user is the payer, reduce their "owed" by their share
      if (splitUserId === payerId) {
        balances[payerId].owed -= splitAmount;
      }
    }
  }

  // Calculate net balance for each user
  const netBalances = Object.keys(balances).map(userId => {
    const balance = balances[userId];
    const net = balance.owed - balance.owes;

    return {
      userId,
      name: expenses.find(e => e.paidBy === userId)?.payer?.name || 
            expenses.find(e => e.splits.some(s => s.userId === userId))?.splits.find(s => s.userId === userId)?.user?.name,
      owes: balance.owes,
      owed: balance.owed,
      net: net, // Positive = they are owed, Negative = they owe
      currency: balance.currency
    };
  });

  // If userId is specified, filter to that user's perspective
  if (userId) {
    const userBalance = netBalances.find(b => b.userId === userId);
    if (!userBalance) {
      return {
        userId,
        owes: 0,
        owed: 0,
        net: 0,
        currency: 'INR',
        breakdown: []
      };
    }

    // Create breakdown: who owes this user and who this user owes
    const breakdown = [];
    for (const expense of expenses) {
      const payerId = expense.paidBy;
      const isPayer = payerId === userId;

      for (const split of expense.splits) {
        const splitUserId = split.userId;
        const splitAmount = parseFloat(split.amount);

        if (isPayer && splitUserId !== userId) {
          // User paid, someone else owes them
          breakdown.push({
            expenseId: expense.id,
            expenseTitle: expense.title,
            otherUserId: splitUserId,
            otherUserName: split.user.user.name,
            amount: splitAmount,
            type: 'owed', // User is owed this amount
            currency: expense.currency
          });
        } else if (!isPayer && splitUserId === userId && payerId !== userId) {
          // Someone else paid, user owes them
          breakdown.push({
            expenseId: expense.id,
            expenseTitle: expense.title,
            otherUserId: payerId,
            otherUserName: expense.payer.name,
            amount: splitAmount,
            type: 'owes', // User owes this amount
            currency: expense.currency
          });
        }
      }
    }

    return {
      ...userBalance,
      breakdown
    };
  }

  return netBalances;
};

// GET /groups/:groupId/balances
router.get('/groups/:groupId/balances', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if group exists and user is a member
    const group = await Group.findByPk(groupId, {
      include: [{
        model: User,
        as: 'members',
        through: { attributes: [] }
      }]
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(member => member.id === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const balances = await calculateGroupBalances(groupId);

    res.json({
      groupId,
      groupName: group.name,
      balances
    });
  } catch (error) {
    console.error('Get group balances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /balances/summary
router.get('/summary', async (req, res) => {
  try {
    // Get all groups user is a member of
    const groups = await Group.findAll({
      include: [{
        model: User,
        as: 'members',
        where: { id: req.user.id },
        through: { attributes: [] }
      }]
    });

    const summary = {
      totalOwed: 0, // Total amount others owe the user
      totalOwes: 0, // Total amount user owes others
      netBalance: 0,
      currency: req.user.defaultCurrency,
      byGroup: []
    };

    for (const group of groups) {
      const userBalance = await calculateGroupBalances(group.id, req.user.id);
      
      summary.totalOwed += userBalance.owed || 0;
      summary.totalOwes += userBalance.owes || 0;
      
      summary.byGroup.push({
        groupId: group.id,
        groupName: group.name,
        owes: userBalance.owes || 0,
        owed: userBalance.owed || 0,
        net: userBalance.net || 0,
        currency: userBalance.currency || req.user.defaultCurrency,
        breakdown: userBalance.breakdown || []
      });
    }

    summary.netBalance = summary.totalOwed - summary.totalOwes;

    res.json({
      summary
    });
  } catch (error) {
    console.error('Get balance summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

