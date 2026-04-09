const authService = require('../services/auth.service');
const ResponseHandler = require('../handlers/response.handler');
const { loginSchema } = require('../validators/auth.validator');

async function login(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return ResponseHandler.validationError(res, error.details.map((d) => d.message));
    }

    const result = await authService.login(value.user_login, value.password);
    return ResponseHandler.success(res, result, 'Login successful');
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await authService.getProfile(req.user.user_id);
    return ResponseHandler.success(res, user);
  } catch (err) {
    if (err.status) return ResponseHandler.error(res, err.message, err.status);
    next(err);
  }
}

/**
 * Logout — stateless JWT, so the client drops the token.
 * Requires auth so we know who is logging out; extend here
 * if server-side session invalidation (loggedSessions) is added later.
 */
async function logout(req, res) {
  return ResponseHandler.success(res, null, 'Logged out successfully');
}

module.exports = { login, getProfile, logout };
