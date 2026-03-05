const express = require('express');
const controller = require('../controllers/accountingController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

const router = express.Router();

// Require JWT on all accounting routes.
router.use(requireAuth);

// Overview and list/read endpoints.
router.get('/overview', requirePermission('accounting.view'), controller.getOverview);
router.get('/expenses', requirePermission('accounting.view'), controller.listExpenses);

// Write operations.
router.post('/expenses', requirePermission('accounting.manage'), controller.createExpense);
router.delete('/expenses/:id', requirePermission('accounting.manage'), controller.deleteExpense);
router.get('/credit-collections', requirePermission('accounting.view'), controller.listCreditCollections);
router.post('/credit-collections', requirePermission('accounting.manage'), controller.createCreditCollection);
router.get('/other-income', requirePermission('accounting.view'), controller.listOtherIncome);
router.post('/other-income', requirePermission('accounting.manage'), controller.createOtherIncome);

// Export endpoint.
router.get('/export', requirePermission('accounting.export'), controller.exportAccountingData);

module.exports = router;