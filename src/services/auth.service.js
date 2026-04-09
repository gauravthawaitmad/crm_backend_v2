const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, UserPassword } = require('../../models');
const { ALLOWED_ROLES } = require('../utils/roleUtils');

/**
 * Authenticates a user and returns a signed JWT + safe user fields.
 *
 * Steps:
 * 1. Find user by user_login
 * 2. Role gate — block roles not permitted to use the CRM
 * 3. Find UserPassword record; handle first-time login (no row yet)
 * 4. Check removed / disabled
 * 5. Check account lock
 * 6. Verify password + record attempt
 * 7. Sign JWT and return response with requiresPasswordChange flag
 */
async function login(user_login, password) {
  // 1. Find user by login
  const user = await User.findOne({ where: { user_login: user_login.toLowerCase().trim() } });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // 2. Role gate — block roles that have no access to this app
  if (!ALLOWED_ROLES.includes(user.user_role)) {
    const err = new Error('You do not have access to this application.');
    err.status = 403;
    throw err;
  }

  // 3. Find password record — handle first-time login
  // user_data.user_id is STRING ("1924598.000000000"), user_passwords.user_id is INTEGER
  const numericUserId = parseInt(parseFloat(user.user_id));
  let userPassword = await UserPassword.findOne({ where: { user_id: numericUserId } });

  if (!userPassword) {
    // No password record yet — only the default password is accepted
    if (password !== 'password') {
      const err = new Error('For your first login, please use the default password.');
      err.status = 401;
      throw err;
    }

    // Create initial password row; beforeCreate hook will hash password_hash
    const salt = await bcrypt.genSalt(12);
    userPassword = await UserPassword.create({
      user_id: numericUserId,
      password_hash: 'password',
      salt,
      is_default_password: true,
      login_attempts: 0,
      emailVerified: false,
    });

    await userPassword.recordLogin(true);
    return _buildLoginResponse(user, userPassword);
  }

  // 4. Removed / disabled check
  if (userPassword.removed) {
    const err = new Error('Your account has been disabled. Contact your administrator.');
    err.status = 403;
    throw err;
  }

  // 5. Account lock check
  if (userPassword.isAccountLocked()) {
    const err = new Error('Account is temporarily locked. Please try again later.');
    err.status = 401;
    throw err;
  }

  // 6. Verify password and record attempt
  const isValid = await userPassword.verifyPassword(password);
  await userPassword.recordLogin(isValid);

  if (!isValid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  return _buildLoginResponse(user, userPassword);
}

/**
 * Builds the JWT + response payload after a successful login.
 */
function _buildLoginResponse(user, userPassword) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const token = jwt.sign(
    {
      user_id: user.user_id,
      user_role: user.user_role,
      user_display_name: user.user_display_name,
      email: user.email,
    },
    secret,
    { expiresIn: '24h' }
  );

  return {
    token,
    requiresPasswordChange: userPassword.is_default_password === true,
    user: {
      user_id: user.user_id,
      user_role: user.user_role,
      user_display_name: user.user_display_name,
      email: user.email,
    },
  };
}

/**
 * Returns safe user profile fields (no password data).
 */
async function getProfile(user_id) {
  const user = await User.findOne({ where: { user_id } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return {
    user_id: user.user_id,
    user_login: user.user_login,
    user_display_name: user.user_display_name,
    user_role: user.user_role,
    email: user.email,
    city: user.city,
    state: user.state,
    center: user.center,
    contact: user.contact,
  };
}

module.exports = { login, getProfile };
