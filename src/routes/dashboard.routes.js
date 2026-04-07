'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

const router = Router();

router.use(authMiddleware);

// GET /api/dashboard/metrics — role-scoped metrics
router.get('/metrics', dashboardController.getMetrics);

// GET /api/dashboard/deliverables — funder deliverables due this month
router.get('/deliverables', dashboardController.getDeliverables);

module.exports = router;
