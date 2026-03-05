const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// This is one item row inside a sale.
const saleLineSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    itemName: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

// Main sale record saved after checkout.
const saleSchema = new mongoose.Schema(
  {
    // Sale number users see on receipts and reports.
    saleNo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    saleType: {
      type: String,
      enum: ['cash', 'credit'],
      required: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Walk-in Customer'
    },
    customerPhone: {
      type: String,
      trim: true,
      default: ''
    },
    customerNin: {
      type: String,
      trim: true,
      default: ''
    },
    lines: {
      type: [saleLineSchema],
      validate: [(value) => Array.isArray(value) && value.length > 0, 'At least one sale item is required']
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0
    },
    // Amount reduced from subtotal.
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Final amount after discount.
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    // Money already paid at sale time.
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    // Remaining amount to be paid later.
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    saleDate: {
      type: Date,
      default: Date.now
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

module.exports = mongoose.model('Sale', saleSchema);