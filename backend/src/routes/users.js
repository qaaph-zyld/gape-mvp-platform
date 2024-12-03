const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { profileUpdateValidation } = require('../middleware/validators');
const logger = require('../config/logger');
const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', [auth, profileUpdateValidation], async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();
    logger.info(`User profile updated: ${user.email}`);

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
});

// Delete user account
router.delete('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.remove();
    logger.info(`User account deleted: ${user.email}`);
    res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
