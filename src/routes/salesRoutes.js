const express = require('express');
const controller = require('../controllers/salesController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
	validateCreateCustomer,
	validateUpdateCustomer,
	validateCustomerPayment,
	validateCreateCashSale,
	validateCreateCreditSale
} = require('../validators/salesValidators');

const router = express.Router();

// Require JWT on all sales routes.
router.use(requireAuth);

// Sales summary and sale creation.
router.get('/dashboard', requirePermission('sales.view'), controller.getDashboard);
router.post('/cash-sales', requirePermission('sales.manage'), validateRequest(validateCreateCashSale), controller.createCashSale);
router.post('/credit-sales', requirePermission('sales.manage'), validateRequest(validateCreateCreditSale), controller.createCreditSale);

// Customer management and payment history.
router.get('/customers', requirePermission('sales.view'), controller.listCustomers);
router.post('/customers', requirePermission('sales.manage'), validateRequest(validateCreateCustomer), controller.createCustomer);
router.patch('/customers/:id', requirePermission('sales.manage'), validateRequest(validateUpdateCustomer), controller.updateCustomer);
router.delete('/customers/:id', requirePermission('sales.manage'), controller.deleteCustomer);
router.get('/customers/:id/payments', requirePermission('sales.view'), controller.listCustomerPayments);
router.post('/customers/:id/payments', requirePermission('sales.manage'), validateRequest(validateCustomerPayment), controller.addCustomerPayment);

// Reporting and sale record lookup.
router.get('/daily-report', requirePermission('sales.view'), controller.getDailySalesReport);
router.get('/export', requirePermission('sales.export'), controller.exportSalesData);
router.get('/', requirePermission('sales.view'), controller.listSales);
router.get('/:id', requirePermission('sales.view'), controller.getSaleById);

module.exports = router;