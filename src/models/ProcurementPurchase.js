const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// This is one item row inside a purchase.
const purchaseLineSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    sellingPrice: {
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

// Main purchase record saved when stock is bought.
const procurementPurchaseSchema = new mongoose.Schema(
  {
    // Purchase number users see on receipts and reports.
    purchaseNo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    supplierName: {
      type: String,
      required: true,
      trim: true
    },
    paymentType: {
      type: String,
      enum: ['cash', 'credit'],
      required: true
    },
    lines: {
      type: [purchaseLineSchema],
      validate: [(value) => Array.isArray(value) && value.length > 0, 'At least one purchase item is required']
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
    // Money already paid at purchase time.
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    // Remaining amount to pay supplier later.
    balanceDue: {
      type: Number,
      default: 0,
      min: 0
    },
    purchaseDate: {
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
      ref: 'User',
      required: true
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

module.exports = mongoose.model('ProcurementPurchase', procurementPurchaseSchema);