'use strict';

/**
 * stage-configs.js
 *
 * Stage definitions for each partnership entity type.
 * Used by partner.service.js for stage validation and by frontend for config-driven UIs.
 */

module.exports = {
  school: {
    stages: [
      'new',
      'first_conversation',
      'interested',
      'interested_but_facing_delay',
      'not_interested',
      'converted',
      'dropped',
    ],
    terminalStages: ['converted', 'dropped', 'not_interested'],
    initialStage: 'new',
  },
  sourcing: {
    stages: [
      'identified',
      'first_contact',
      'in_discussion',
      'onboarded',
      'paused',
      'dropped',
    ],
    terminalStages: ['dropped'],
    initialStage: 'identified',
  },
  funder: {
    stages: [
      'prospect',
      'in_discussion',
      'agreed',
      'active',
      'completed',
      'dropped',
    ],
    terminalStages: ['completed', 'dropped'],
    initialStage: 'prospect',
  },
  vendor: {
    stages: [
      'identified',
      'contacted',
      'approved',
      'active',
      'inactive',
      'dropped',
    ],
    terminalStages: ['dropped'],
    initialStage: 'identified',
  },
};
