// Centralized RBAC permission config
// Designed per REBUILD_PLAN.md Section 5
// This replaces scattered if/else role checks in controllers

const PERMISSIONS = {
  lead: {
    view_all:  ['super_admin', 'admin'],
    view_team: ['manager'],
    view_own:  ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'],
    create:    ['super_admin', 'admin', 'manager', 'CO Full Time', 'CO Part Time', 'CHO,CO Part Time'],
    edit:      ['super_admin', 'admin', 'manager', 'CO Full Time', 'CO Part Time', 'CHO,CO Part Time'],
    delete:    ['super_admin', 'admin'],
    export:    ['super_admin', 'admin', 'manager'],
  },
  organization: {
    view_all:   ['super_admin', 'admin'],
    view_team:  ['manager'],
    view_own:   ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'],
    create:     [],                   // Organizations are created via Lead conversion only
    edit:       ['super_admin', 'admin', 'manager'],
    delete:     ['super_admin', 'admin'],
    export:     ['super_admin', 'admin', 'manager'],
    renew_mou:  ['super_admin', 'admin', 'manager'],
    reallocate: ['super_admin', 'admin'],
  },
  poc: {
    view_all:  ['super_admin', 'admin'],
    view_team: ['manager'],
    view_own:  ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'],
    create:    ['super_admin', 'admin', 'manager', 'CO Full Time', 'CO Part Time', 'CHO,CO Part Time'],
    edit:      ['super_admin', 'admin', 'manager', 'CO Full Time', 'CO Part Time', 'CHO,CO Part Time'],
    delete:    ['super_admin', 'admin'],
  },
  user: {
    view_all: ['super_admin', 'admin'],
    create:   ['super_admin'],
    edit:     ['super_admin'],
    delete:   ['super_admin'],
  },
  dashboard: {
    view_own:  ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'],
    view_team: ['manager'],
    view_all:  ['super_admin', 'admin'],
    export:    ['super_admin', 'admin', 'manager'],
  },
};

/**
 * Check if a role has permission to perform an action on a resource.
 * @param {string} userRole
 * @param {string} resource  - e.g. 'lead', 'organization'
 * @param {string} action    - e.g. 'create', 'edit', 'view_own'
 * @returns {boolean}
 */
function can(userRole, resource, action) {
  return PERMISSIONS[resource]?.[action]?.includes(userRole) ?? false;
}

/**
 * Determine data scope based on role.
 * Used in services to build WHERE clauses.
 * @param {string} userRole
 * @returns {'all' | 'team' | 'own'}
 */
function getDataScope(userRole) {
  if (['super_admin', 'admin'].includes(userRole)) return 'all';
  if (userRole === 'manager') return 'team';
  return 'own';
}

/**
 * Check if user can VIEW any records for a resource (own/team/all).
 * Use this to gate list endpoints — the minimum bar to access the route.
 * @param {string} userRole
 * @param {string} resource
 * @returns {boolean}
 */
function canView(userRole, resource) {
  const res = PERMISSIONS[resource];
  if (!res) return false;
  return (
    res.view_all?.includes(userRole) ||
    res.view_team?.includes(userRole) ||
    res.view_own?.includes(userRole)
  ) ?? false;
}

module.exports = { PERMISSIONS, can, getDataScope, canView };
