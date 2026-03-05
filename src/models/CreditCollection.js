const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Records money collected from customers for outstanding credit.
const creditCollectionSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      default: 'cash',
      trim: true
    },
    reference: {
      type: String,
      trim: true,
      default: ''
    },
    collectionDate: {
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

module.exports = mongoose.model('CreditCollection', creditCollectionSchema);