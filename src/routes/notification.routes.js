'use strict';

const { Router }       = require('express');
const authMiddleware   = require('../middlewares/auth.middleware');
const notificationCtrl = require('../controllers/notification.controller');

const router = Router();
router.use(authMiddleware);

// GET  /api/notifications/unread-count  — must be before /:id
router.get('/unread-count', notificationCtrl.unreadCount);

// PATCH /api/notifications/read-all     — must be before /:id
router.patch('/read-all', notificationCtrl.markAllRead);

// GET   /api/notifications
router.get('/', notificationCtrl.list);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationCtrl.markRead);

module.exports = router;
