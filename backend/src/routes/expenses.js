const express = require('express');
const { body, validationResult } = require('express-validator');
const { Expense } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /expenses/personal
router.post('/personal', [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP']),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, amount, currency = req.user.defaultCurrency, date } = req.body;

    const expense = await Expense.create({
      title,
      amount,
      currency,
      date: date || new Date(),
      paidBy: req.user.id,
      isPersonal: true,
      groupId: null
    });

    res.status(201).json({
      message: 'Personal expense added successfully',
      expense: {
        id: expense.id,
        title: expense.title,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        isPersonal: expense.isPersonal
      }
    });
  } catch (error) {
    console.error('Create personal expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expenses/personal
router.get('/personal', async (req, res) => {
  try {
    const expenses = await Expense.findAll({
      where: {
        paidBy: req.user.id,
        isPersonal: true
      },
      order: [['date', 'DESC']],
      attributes: ['id', 'title', 'amount', 'currency', 'date']
    });

    res.json({
      expenses
    });
  } catch (error) {
    console.error('Get personal expenses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

