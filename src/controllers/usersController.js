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
    // Keep role updates aligned with the same cross-branch read scope used by user listing.
    const userFilter = req.readBranch ? { _id: req.params.id, branch: req.readBranch } : { _id: req.params.id };

    // Restrict returned fields to avoid leaking sensitive user attributes.
    const user = await User.findOneAndUpdate(
      userFilter,
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

async function deleteUser(req, res, next) {
  try {
    if (req.auth?.sub === req.params.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    // Deletion follows the same admin branch override rules as list/update operations.
    const userFilter = req.readBranch ? { _id: req.params.id, branch: req.readBranch } : { _id: req.params.id };
    const user = await User.findOne(userFilter, 'name email role branch');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.deleteOne({ _id: user._id });

    await auditService.createAuditEvent({
      module: 'users',
      action: 'user.deleted',
      actor: req.auth.sub,
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: {
        name: user.name,
        email: user.email,
        role: user.role
      },
      branch: user.branch
    });

    return res.status(200).json({ success: true, message: 'User deleted' });
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
  deleteUser,
  listAuditEvents
};
