const express = require('express');
const controller = require('../controllers/procurementController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
	validateCreateSupplier,
	validateUpdateSupplier,
	validateSupplierPayment,
	validateCreatePurchase
} = require('../validators/procurementValidators');

const router = express.Router();

// Require JWT on all procurement routes.
router.use(requireAuth);

// Dashboard and inventory endpoints.
router.get('/overview', requirePermission('procurement.view'), controller.getOverview);
router.get('/items', requirePermission('procurement.view'), controller.listItems);
router.post('/items', requirePermission('procurement.manage'), controller.createItem);
router.post('/inventory-adjustments', requirePermission('procurement.manage'), controller.addInventoryAdjustment);
router.post('/damaged-stock', requirePermission('procurement.manage'), controller.recordDamagedStock);

// Supplier management and payment actions.
router.get('/suppliers', requirePermission('procurement.view'), controller.listSuppliers);
router.post('/suppliers', requirePermission('procurement.manage'), validateRequest(validateCreateSupplier), controller.createSupplier);
router.patch('/suppliers/:id', requirePermission('procurement.manage'), validateRequest(validateUpdateSupplier), controller.updateSupplier);
router.delete('/suppliers/:id', requirePermission('procurement.manage'), controller.deleteSupplier);
router.post('/suppliers/:id/payment-actions', requirePermission('procurement.manage'), validateRequest(validateSupplierPayment), controller.supplierPaymentAction);

// Purchase lifecycle and reporting endpoints.
router.post('/purchases', requirePermission('procurement.manage'), validateRequest(validateCreatePurchase), controller.createPurchase);
router.get('/purchases', requirePermission('procurement.view'), controller.listPurchases);
router.get('/purchases/:id', requirePermission('procurement.view'), controller.getPurchaseById);
router.get('/stock-report', requirePermission('procurement.view'), controller.getStockReport);
router.get('/purchase-report', requirePermission('procurement.view'), controller.getPurchaseReport);
router.get('/receipts', requirePermission('procurement.view'), controller.listProcurementReceipts);
router.get('/reports/export', requirePermission('procurement.export'), controller.exportProcurementReports);

module.exports = router;