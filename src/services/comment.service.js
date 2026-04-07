'use strict';

const commentRepo = require('../repositories/comment.repository');

async function getComments(partnerId) {
  return commentRepo.findByPartnerId(partnerId);
}

async function addComment(partnerId, userId, text) {
  return commentRepo.create({ partner_id: partnerId, user_id: userId, comment_text: text });
}

async function editComment(commentId, userId, text) {
  return commentRepo.update(commentId, userId, text);
}

async function deleteComment(commentId, userId) {
  return commentRepo.softDelete(commentId, userId);
}

module.exports = { getComments, addComment, editComment, deleteComment };
