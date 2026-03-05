const express = require('express');

const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Public authentication endpoints.
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected identity endpoint for current logged-in user profile.
router.get('/me', requireAuth, authController.me);

module.exports = router;
