// Copied from crm_backend/src/utils/roleUtils.js
// Kept as-is — these are the actual roles from the warehouse sync

const ALLOWED_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'CXO',
  'Function Lead',
  'Project Lead',
  'Project Associate',
  'CO Full Time',
  'CO Part Time',
  'CHO,CO Part Time',
  'Academic Support',
  'Wingman',
  'co',
];

// Higher number = higher authority
const ROLE_HIERARCHY = {
  'super_admin':       100,
  'admin':             90,
  'CXO':               80,
  'Function Lead':     70,
  'Project Lead':      60,
  'manager':           50,
  'Project Associate': 40,
  'CO Full Time':      30,
  'CHO,CO Part Time':  25,
  'CO Part Time':      20,
  'Academic Support':  15,
  'Wingman':           10,
  'co':                5,
};

// CO-type roles — can only see their own assigned partners
const CO_ROLES = ['CO Full Time', 'CO Part Time', 'CHO,CO Part Time', 'co'];

function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
}

function isCO(role) {
  return CO_ROLES.includes(role);
}

function isManager(role) {
  return role === 'manager';
}

function isAdmin(role) {
  return role === 'admin' || role === 'super_admin';
}

// Middleware factory — blocks request if user level is below required
function requireRole(minLevel) {
  return (req, res, next) => {
    const userLevel = getRoleLevel(req.user?.user_role);
    if (userLevel < minLevel) {
      return res.status(403).json({ success: false, message: 'Insufficient role level' });
    }
    next();
  };
}

module.exports = {
  ALLOWED_ROLES,
  ROLE_HIERARCHY,
  CO_ROLES,
  getRoleLevel,
  isCO,
  isManager,
  isAdmin,
  requireRole,
};
