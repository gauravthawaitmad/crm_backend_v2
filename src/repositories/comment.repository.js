'use strict';

const { PartnerComment, sequelize } = require('../../models');
const { QueryTypes } = require('sequelize');

async function findByPartnerId(partnerId) {
  const rows = await sequelize.query(
    `SELECT
       pc.id,
       pc.partner_id,
       pc.user_id,
       pc.comment_text,
       pc.is_edited,
       pc.edited_at,
       pc."createdAt",
       pc."updatedAt",
       u.user_display_name,
       u.user_role
     FROM partner_comments pc
     LEFT JOIN user_data u ON u.user_id = pc.user_id
     WHERE pc.partner_id = :partnerId
       AND pc.removed = false
     ORDER BY pc."createdAt" DESC`,
    { replacements: { partnerId }, type: QueryTypes.SELECT }
  );

  return rows.map((row) => ({
    id: row.id,
    partner_id: row.partner_id,
    user_id: row.user_id,
    comment_text: row.comment_text,
    is_edited: row.is_edited,
    edited_at: row.edited_at,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      user_display_name: row.user_display_name ?? 'Unknown',
      user_role: row.user_role ?? '',
    },
  }));
}

async function create({ partner_id, user_id, comment_text }) {
  return PartnerComment.create({ partner_id, user_id, comment_text });
}

async function update(id, userId, comment_text) {
  const comment = await PartnerComment.findOne({
    where: { id, user_id: userId, removed: false },
  });
  if (!comment) {
    const err = new Error('Comment not found or you are not the author');
    err.statusCode = 403;
    throw err;
  }
  await comment.update({ comment_text, is_edited: true, edited_at: new Date() });
  return comment;
}

async function softDelete(id, userId) {
  const comment = await PartnerComment.findOne({
    where: { id, user_id: userId, removed: false },
  });
  if (!comment) {
    const err = new Error('Comment not found or you are not the author');
    err.statusCode = 403;
    throw err;
  }
  await comment.update({ removed: true });
}

module.exports = { findByPartnerId, create, update, softDelete };
