'use strict';

const notificationSvc = require('../services/notification.service');
const ResponseHandler = require('../handlers/response.handler');

function handleError(res, err) {
  console.error('[notification.controller]', err.message);
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message || 'An error occurred' });
}

async function list(req, res) {
  try {
    const result = await notificationSvc.getUserNotifications(req.user.user_id);
    return ResponseHandler.success(res, result);
  } catch (err) {
    return handleError(res, err);
  }
}

async function unreadCount(req, res) {
  try {
    const count = await notificationSvc.getUnreadCount(req.user.user_id);
    return ResponseHandler.success(res, { unread_count: count });
  } catch (err) {
    return handleError(res, err);
  }
}

async function markRead(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return ResponseHandler.validationError(res, 'Invalid notification ID');

    await notificationSvc.markRead(id, req.user.user_id);
    return ResponseHandler.success(res, null, 'Notification marked as read');
  } catch (err) {
    return handleError(res, err);
  }
}

async function markAllRead(req, res) {
  try {
    const count = await notificationSvc.markAllRead(req.user.user_id);
    return ResponseHandler.success(res, { updated: count }, 'All notifications marked as read');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead };
