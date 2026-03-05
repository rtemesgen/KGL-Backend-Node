const User = require('../models/User');
const auditService = require('../services/auditService');

// User administration endpoints for listing users, role updates, and audit logs.
async function listUsers(req, res, next) {
  try {
    const userFilter = req.readBranch ? { branch: req.readBranch } : {};
    const users = await User.find(userFilter, 'name email role branch createdAt').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    // Restrict returned fields to avoid leaking sensitive user attributes.
    const user = await User.findByIdAndUpdate(
      { _id: req.params.id, branch: req.branch },
      { role: req.body.role },
      { new: true, runValidators: true, fields: 'name email role branch createdAt' }
    );

    if (!user) {
      // Keep missing-user response explicit for admin UIs.
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, message: 'User role updated', data: { user } });
  } catch (error) {
    return next(error);
  }
}

async function listAuditEvents(req, res, next) {
  try {
    const result = await auditService.listAuditEvents(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  updateUserRole,
  listAuditEvents
};