const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Allowed roles used by auth and permission checks.
const USER_ROLES = ['director', 'admin', 'sales-agent', 'manager'];

// Stores user login and role information.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'sales-agent',
      required: true
    },
    branch: {
      type: String,
      enum: BRANCHES,
      required: true
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.USER_ROLES = USER_ROLES;
module.exports.BRANCHES = BRANCHES;