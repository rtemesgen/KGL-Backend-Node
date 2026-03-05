const bcrypt = require('bcryptjs');

const ApiError = require('../utils/apiError');
const User = require('../models/User');
const { USER_ROLES } = require('../models/User');
const { BRANCHES } = require('../config/branches');
const { signAccessToken } = require('./tokenService');

async function registerUser({ name, email, password, role, branch }) {
  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  if (!branch) {
    throw new ApiError(400, 'branch is required');
  }

  if (role && !USER_ROLES.includes(role)) {
    throw new ApiError(400, `Invalid role. Allowed roles: ${USER_ROLES.join(', ')}`);
  }

  if (!BRANCHES.includes(branch)) {
    throw new ApiError(400, `Invalid branch. Allowed branches: ${BRANCHES.join(', ')}`);
  }

  // Normalize email to avoid duplicate accounts with different casing.
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, 'Email is already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: role || 'sales-agent',
    branch
  });

  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    branch: user.branch
  });

  return {
    user: sanitizeUser(user),
    token
  };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Keep the same error message so we do not reveal which field was wrong.
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    branch: user.branch
  });

  return {
    user: sanitizeUser(user),
    token
  };
}

async function getUserById(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeUser(user);
}

function sanitizeUser(user) {
  // Return only safe fields to API clients.
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    createdAt: user.createdAt
  };
}

module.exports = {
  registerUser,
  loginUser,
  getUserById
};
