const Sale = require('../models/Sale');
const salesService = require('../services/salesService');

// Most sales operations are delegated to service layer for business rules.
// Admin/director writes follow req.writeBranch when a branch override is selected.
async function getDashboard(req, res, next) {
  try {
    const dashboard = await salesService.getDashboard(req.query, req.readBranch);
    res.status(200).json({ success: true, data: { dashboard } });
  } catch (error) {
    next(error);
  }
}

async function createCashSale(req, res, next) {
  try {
    const sale = await salesService.createCashSale(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Cash sale created', data: { sale } });
  } catch (error) {
    next(error);
  }
}

async function createCreditSale(req, res, next) {
  try {
    const sale = await salesService.createCreditSale(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Credit sale created', data: { sale } });
  } catch (error) {
    next(error);
  }
}

async function listCustomers(req, res, next) {
  try {
    const result = await salesService.listCustomers(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const customer = await salesService.createCustomer(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Customer created', data: { customer } });
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await salesService.updateCustomer(req.params.id, req.body, req.auth.sub, req.writeBranch);
    res.status(200).json({ success: true, message: 'Customer updated', data: { customer } });
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    await salesService.deleteCustomer(req.params.id, req.auth.sub, req.writeBranch);
    res.status(200).json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
}

async function addCustomerPayment(req, res, next) {
  try {
    const result = await salesService.addCustomerPayment(req.params.id, req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Customer payment recorded', data: result });
  } catch (error) {
    next(error);
  }
}

async function listCustomerPayments(req, res, next) {
  try {
    const result = await salesService.listCustomerPayments(req.params.id, req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function listSales(req, res, next) {
  try {
    // Build optional Mongo filters from query params (type and date range).
    const filter = {};
    if (req.query.type) {
      filter.saleType = req.query.type;
    }

    if (req.query.from || req.query.to) {
      filter.saleDate = {};
      if (req.query.from) {
        filter.saleDate.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        filter.saleDate.$lte = new Date(req.query.to);
      }
    }

    if (req.readBranch) {
      filter.branch = req.readBranch;
    }

    const sales = await Sale.find(filter).populate('customer', 'name tel nin accountBalance').sort({ saleDate: -1 }).limit(100);
    res.status(200).json({ success: true, data: { sales } });
  } catch (error) {
    next(error);
  }
}

async function getSaleById(req, res, next) {
  try {
    const saleFilter = req.readBranch ? { _id: req.params.id, branch: req.readBranch } : { _id: req.params.id };
    const sale = await Sale.findOne(saleFilter).populate('customer', 'name tel nin accountBalance');
    if (!sale) {
      // Return explicit 404 instead of generic error for missing resource.
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    return res.status(200).json({ success: true, data: { sale } });
  } catch (error) {
    return next(error);
  }
}

async function getDailySalesReport(req, res, next) {
  try {
    const report = await salesService.getDailySalesReport(req.query, req.readBranch);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function exportSalesData(req, res, next) {
  try {
    const exportedData = await salesService.exportSalesData(req.query, req.readBranch);
    res.status(200).json({ success: true, data: exportedData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  createCashSale,
  createCreditSale,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPayment,
  listCustomerPayments,
  listSales,
  getSaleById,
  getDailySalesReport,
  exportSalesData
};