const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/login  — public
router.post('/login', authController.login);

// GET  /api/auth/me     — protected
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
