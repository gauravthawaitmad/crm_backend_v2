'use strict';

const commentService = require('../services/comment.service');
const ResponseHandler = require('../handlers/response.handler');

function handleError(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message || 'An error occurred' });
}

async function list(req, res) {
  try {
    const partnerId = parseInt(req.params.partnerId);
    if (!partnerId) return ResponseHandler.validationError(res, 'Invalid partner ID');
    const comments = await commentService.getComments(partnerId);
    return ResponseHandler.success(res, comments);
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const partnerId = parseInt(req.params.partnerId);
    if (!partnerId) return ResponseHandler.validationError(res, 'Invalid partner ID');
    const { comment_text } = req.body;
    if (!comment_text?.trim()) return ResponseHandler.validationError(res, 'comment_text is required');
    const comment = await commentService.addComment(partnerId, parseInt(req.user.user_id), comment_text.trim());
    return ResponseHandler.created(res, comment);
  } catch (err) {
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { comment_text } = req.body;
    if (!comment_text?.trim()) return ResponseHandler.validationError(res, 'comment_text is required');
    const comment = await commentService.editComment(id, parseInt(req.user.user_id), comment_text.trim());
    return ResponseHandler.success(res, comment);
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    await commentService.deleteComment(id, parseInt(req.user.user_id));
    return ResponseHandler.success(res, null, 'Comment deleted');
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { list, create, update, remove };
