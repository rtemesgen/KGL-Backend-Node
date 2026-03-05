const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Tracks each payment made to a supplier.
const supplierPaymentSchema = new mongoose.Schema(
  {
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'cash'
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    paymentDate: {
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

module.exports = mongoose.model('SupplierPayment', supplierPaymentSchema);