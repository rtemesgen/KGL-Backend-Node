const express = require('express');
const controller = require('../controllers/usersController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// Require JWT on all user-administration routes.
router.use(requireAuth);

// User management and audit trail endpoints.
router.get('/', requirePermission('users.view'), controller.listUsers);
router.get('/audit-events', requirePermission('users.audit'), controller.listAuditEvents);
router.patch('/:id/role', requirePermission('users.manage'), controller.updateUserRole);

module.exports = router;