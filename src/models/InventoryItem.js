const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Master list of inventory items and stock levels.
const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: 'general'
    },
    quantityOnHand: {
      type: Number,
      default: 0,
      min: 0
    },
    minQty: {
      type: Number,
      default: 0,
      min: 0
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: 0
    },
    note: {
      type: String,
      trim: true,
      default: ''
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

inventoryItemSchema.index({ branch: 1, sku: 1 }, { unique: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);