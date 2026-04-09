const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/login  — public
router.post('/login', authController.login);

// GET  /api/auth/me     — protected
router.get('/me', authMiddleware, authController.getProfile);

// POST /api/auth/logout — protected (client drops token; auth ensures valid session)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
