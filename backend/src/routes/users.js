const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /users/search?q=query
// Search users by name or email (excluding current user)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchQuery = q.trim();
    
    const users = await User.findAll({
      where: {
        id: {
          [Op.ne]: req.user.id // Exclude current user
        },
        [Op.or]: [
          {
            name: {
              [Op.iLike]: `%${searchQuery}%`
            }
          },
          {
            email: {
              [Op.iLike]: `%${searchQuery}%`
            }
          }
        ]
      },
      attributes: ['id', 'name', 'email'],
      limit: 20,
      order: [['name', 'ASC']]
    });

    res.json({
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

