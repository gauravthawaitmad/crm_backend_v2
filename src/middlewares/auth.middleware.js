const jwt = require('jsonwebtoken');
const { User } = require('../../models');

/**
 * Verifies JWT token, loads user from DB, attaches req.user.
 * Every protected route must use this middleware.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, secret);

    // Load user from DB to get current role (role may have changed since token was issued)
    const user = await User.findOne({ where: { user_id: decoded.user_id } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = {
      user_id: user.user_id,
      user_role: user.user_role,
      email: user.email,
      user_display_name: user.user_display_name,
      user_login: user.user_login,
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
    next(err);
  }
}

module.exports = authMiddleware;
