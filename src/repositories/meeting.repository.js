'use strict';

/**
 * meeting.repository.js
 *
 * Data-access layer for the `meetings` table.
 */

const { Meeting } = require('../../models');

/**
 * Create a meeting record.
 * Required fields: user_id, poc_id, partner_id, meeting_date
 * Optional: meeting_notes, follow_up_meeting_scheduled, follow_up_meeting_date
 */
async function create(data, transaction) {
  return Meeting.create(data, transaction ? { transaction } : {});
}

/**
 * Get all meetings for a partner, newest first.
 */
async function findByPartnerId(partnerId) {
  return Meeting.findAll({
    where: { partner_id: partnerId },
    order: [['meeting_date', 'DESC']],
  });
}

module.exports = {
  create,
  findByPartnerId,
};
