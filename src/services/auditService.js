const AuditEvent = require('../models/AuditEvent');

async function createAuditEvent(payload, options = {}) {
  if (!payload.branch) {
    throw new Error('Audit event branch is required');
  }

  // Use array create so we can pass a transaction session when needed.
  const docs = await AuditEvent.create([payload], options.session ? { session: options.session } : {});
  return docs[0];
}

function buildListFilter(query, branch) {
  // Add only the filters that are present in the request.
  const filter = branch ? { branch } : {};

  if (query.module) {
    filter.module = query.module;
  }

  if (query.action) {
    filter.action = query.action;
  }

  if (query.actor) {
    filter.actor = query.actor;
  }

  if (query.entityType) {
    filter.entityType = query.entityType;
  }

  if (query.entityId) {
    filter.entityId = query.entityId;
  }

  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      filter.createdAt.$gte = new Date(query.from);
    }
    if (query.to) {
      filter.createdAt.$lte = new Date(query.to);
    }
  }

  return filter;
}

async function listAuditEvents(query, branch) {
  // Basic pagination with a max page size to protect the database.
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = buildListFilter(query, branch);

  const [items, total] = await Promise.all([
    AuditEvent.find(filter).populate('actor', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditEvent.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total
    }
  };
}

module.exports = {
  createAuditEvent,
  listAuditEvents
};