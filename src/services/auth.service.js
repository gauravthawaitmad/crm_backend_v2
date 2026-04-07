const jwt = require('jsonwebtoken');
const { User, UserPassword } = require('../../models');

/**
 * Authenticates a user and returns a signed JWT + safe user fields.
 */
async function login(user_login, password) {
  // 1. Find user by login
  const user = await User.findOne({ where: { user_login: user_login.toLowerCase().trim() } });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // 2. Find password record
  // user_data.user_id is STRING ("1924598.000000000"), user_passwords.user_id is INTEGER
  const numericUserId = parseInt(parseFloat(user.user_id));
  const userPassword = await UserPassword.findOne({ where: { user_id: numericUserId } });
  if (!userPassword) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // 3. Check account lock
  if (userPassword.isAccountLocked()) {
    const err = new Error('Account is temporarily locked. Please try again later.');
    err.status = 401;
    throw err;
  }

  // 4. Verify password using model's instance method (handles default + bcrypt)
  const isValid = await userPassword.verifyPassword(password);

  // 5. Record login attempt (success or failure)
  await userPassword.recordLogin(isValid);

  if (!isValid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // 6. Sign JWT
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
