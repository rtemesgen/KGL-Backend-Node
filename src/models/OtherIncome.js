const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Stores non-sales income records.
const otherIncomeSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    incomeDate: {
      type: Date,
      default: Date.now
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

module.exports = mongoose.model('OtherIncome', otherIncomeSchema);