const mongoose = require('mongoose');
const { BRANCHES } = require('../config/branches');

// Stores audit trail records for important user actions.
const auditEventSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    entityType: {
      type: String,
      required: true,
      trim: true
    },
    entityId: {
      type: String,
      required: true,
      trim: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    branch: {
      type: String,
      enum: BRANCHES,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

function immutableHook() {
  throw new Error('AuditEvent is immutable and cannot be modified or deleted');
}

// Audit logs are write-once records.
auditEventSchema.pre('updateOne', immutableHook);
auditEventSchema.pre('updateMany', immutableHook);
auditEventSchema.pre('findOneAndUpdate', immutableHook);
auditEventSchema.pre('deleteOne', immutableHook);
auditEventSchema.pre('deleteMany', immutableHook);
auditEventSchema.pre('findOneAndDelete', immutableHook);

module.exports = mongoose.model('AuditEvent', auditEventSchema);