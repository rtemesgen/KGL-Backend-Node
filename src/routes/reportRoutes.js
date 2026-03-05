const express = require('express');
const controller = require('../controllers/reportController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// Require JWT on all report routes.
router.use(requireAuth);

// Aggregated report read/export endpoints.
router.get('/overview', requirePermission('report.view'), controller.getReportOverview);
router.get('/export', requirePermission('report.export'), controller.exportReports);

module.exports = router;