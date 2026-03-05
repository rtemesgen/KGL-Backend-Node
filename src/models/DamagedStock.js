const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Logs stock that was removed because it was damaged.
const damagedStockSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    reason: {
      type: String,
      trim: true,
      default: 'damaged'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    reportedAt: {
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

module.exports = mongoose.model('DamagedStock', damagedStockSchema);