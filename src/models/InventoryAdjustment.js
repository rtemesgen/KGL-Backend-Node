const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Records manual stock adjustments (add, remove, or set).
const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    type: {
      type: String,
      enum: ['add', 'remove', 'set'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      trim: true,
      default: 'manual-adjustment'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    adjustedAt: {
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

module.exports = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);