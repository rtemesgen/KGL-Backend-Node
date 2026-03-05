const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Stores customer profile and running credit/payment balances.
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    tel: {
      type: String,
      required: true,
      trim: true
    },
    nin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    totalCredit: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    accountBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    branch: {
      type: String,
      enum: BRANCHES,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

customerSchema.index({ branch: 1, tel: 1 }, { unique: true });
customerSchema.index({ branch: 1, nin: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);