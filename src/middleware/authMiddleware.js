const ApiError = require('../utils/apiError');
const { verifyAccessToken } = require('../services/tokenService');
const { USER_ROLES } = require('../models/User');
const { hasPermission } = require('../config/permissions');
const { isValidBranch } = require('../config/branches');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authorization token is missing'));
  }

  const token = authHeader.split(' ')[1];

  try {
    // Persist token payload on request for downstream authorization checks.
    const payload = verifyAccessToken(token);

    if (!payload.branch || !isValidBranch(payload.branch)) {
      return next(new ApiError(401, 'Token is missing a valid branch. Please login again'));
    }

    if (payload.role === 'admin' && req.query.branch && !isValidBranch(req.query.branch)) {
      return next(new ApiError(400, 'Invalid branch filter in query'));
    }

    req.auth = payload;
    req.branch = payload.branch;
    req.readBranch = payload.role === 'admin' ? req.query.branch || null : payload.branch;
    return next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

function requireRole(...allowedRoles) {
  // Support both requireRole('ADMIN') and requireRole(['ADMIN', 'MANAGER']).
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return next(new ApiError(403, 'User role is missing in token'));
    }

    if (!roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };
}

function requirePermission(permission) {
  // Permission checks are role-derived via centralized permission map.
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return next(new ApiError(403, 'User role is missing in token'));
    }

    if (!hasPermission(req.auth.role, permission)) {
      return next(new ApiError(403, `Access denied: missing permission ${permission}`));
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
  requirePermission,
  USER_ROLES
};
