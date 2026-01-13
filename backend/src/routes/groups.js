const express = require('express');
const { body, validationResult } = require('express-validator');
const { Group, GroupMember, User, Expense, ExpenseSplit } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /groups
router.post('/', [
  body('name').trim().notEmpty().withMessage('Group name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;

    // Create group
    const group = await Group.create({
      name,
      createdBy: req.user.id
    });

    // Add creator as a member
    await GroupMember.create({
      groupId: group.id,
      userId: req.user.id
    });

    const groupWithMembers = await Group.findByPk(group.id, {
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] }
      }]
    });

    res.status(201).json({
      message: 'Group created successfully',
      group: groupWithMembers
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /groups
router.get('/', async (req, res) => {
  try {
    // First, find all groups where the user is a member
    const userGroups = await GroupMember.findAll({
      where: { userId: req.user.id },
      attributes: ['groupId']
    });
    console.log("🚀 ~ userGroups:", userGroups)

    const groupIds = userGroups.map(gm => gm.groupId);

    if (groupIds.length === 0) {
      return res.json({ groups: [] });
    }

    // Then fetch all groups with all their members
    const groups = await Group.findAll({
      where: {
        id: groupIds
      },
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] }
      }]
    });

    res.json({
      groups
    });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups/:groupId/members
router.post('/:groupId/members', [
  body('userIds').isArray({ min: 1 }).withMessage('At least one user ID is required'),
  body('userIds.*').isUUID().withMessage('Invalid user ID format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { userIds } = req.body;

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

    // Add new members
    const addedMembers = [];
    for (const userId of userIds) {
      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        continue; // Skip invalid user IDs
      }

      // Check if already a member
      const existingMember = await GroupMember.findOne({
        where: { groupId, userId }
      });

      if (!existingMember) {
        await GroupMember.create({ groupId, userId });
        addedMembers.push(user);
      }
    }

    // Fetch updated group with all members
    const updatedGroup = await Group.findByPk(groupId, {
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'email'],
        through: { attributes: [] }
      }]
    });

    res.json({
      message: 'Members added successfully',
      addedMembers: addedMembers.map(u => ({ id: u.id, name: u.name, email: u.email })),
      group: updatedGroup
    });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /groups/:groupId/expenses
router.post('/:groupId/expenses', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP']),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
  body('splitType').optional().isIn(['equal', 'exact']),
  body('splits').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { title, amount, currency, date, splitType = 'equal', splits, paidBy } = req.body;

    // Check if group exists and user is a member
    const group = await Group.findByPk(groupId, {
      include: [{
        model: User,
        as: 'members',
        attributes: ['id', 'name', 'email'],
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

    const payerId = paidBy || req.user.id;
    const expenseCurrency = currency || group.members[0]?.defaultCurrency || 'INR';

    // Create expense
    const expense = await Expense.create({
      title,
      amount: parseFloat(amount),
      currency: expenseCurrency,
      date: date || new Date(),
      paidBy: payerId,
      groupId,
      splitType,
      isPersonal: false
    });

    // Create expense splits
    if (splitType === 'equal') {
      // Equal split among all members
      const shareAmount = parseFloat(amount) / group.members.length;
      for (const member of group.members) {
        await ExpenseSplit.create({
          expenseId: expense.id,
          userId: member.id,
          amount: shareAmount
        });
      }
    } else if (splitType === 'exact' && splits) {
      // Exact amounts specified
      let totalSplit = 0;
      for (const split of splits) {
        if (!group.members.find(m => m.id === split.userId)) {
          return res.status(400).json({ error: `User ${split.userId} is not a group member` });
        }
        await ExpenseSplit.create({
          expenseId: expense.id,
          userId: split.userId,
          amount: parseFloat(split.amount)
        });
        totalSplit += parseFloat(split.amount);
      }

      if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        return res.status(400).json({ error: 'Split amounts must equal the total amount' });
      }
    }

    // Fetch expense with splits
    const expenseWithSplits = await Expense.findByPk(expense.id, {
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ExpenseSplit,
          as: 'splits',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }]
        }
      ]
    });

    res.status(201).json({
      message: 'Group expense added successfully',
      expense: expenseWithSplits
    });
  } catch (error) {
    console.error('Create group expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /groups/:groupId/expenses
router.get('/:groupId/expenses', async (req, res) => {
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

    const expenses = await Expense.findAll({
      where: { groupId },
      include: [
        {
          model: User,
          as: 'payer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ExpenseSplit,
          as: 'splits',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }]
        }
      ],
      order: [['date', 'DESC']]
    });

    res.json({
      expenses
    });
  } catch (error) {
    console.error('Get group expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

