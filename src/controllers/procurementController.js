const procurementService = require('../services/procurementService');

// Procurement controller methods orchestrate HTTP I/O around service calls.
// Admin/director writes follow req.writeBranch when a branch override is selected.
async function getOverview(req, res, next) {
  try {
    const overview = await procurementService.getOverview(req.query, req.readBranch);
    res.status(200).json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
}

async function listItems(req, res, next) {
  try {
    const result = await procurementService.listItems(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await procurementService.createItem(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Item created', data: { item } });
  } catch (error) {
    next(error);
  }
}

async function addInventoryAdjustment(req, res, next) {
  try {
    const result = await procurementService.addInventoryAdjustment(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Inventory adjustment recorded', data: result });
  } catch (error) {
    next(error);
  }
}

async function recordDamagedStock(req, res, next) {
  try {
    const result = await procurementService.recordDamagedStock(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Damaged stock recorded', data: result });
  } catch (error) {
    next(error);
  }
}

async function listSuppliers(req, res, next) {
  try {
    const result = await procurementService.listSuppliers(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createSupplier(req, res, next) {
  try {
    const supplier = await procurementService.createSupplier(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Supplier created', data: { supplier } });
  } catch (error) {
    next(error);
  }
}

async function updateSupplier(req, res, next) {
  try {
    const supplier = await procurementService.updateSupplier(req.params.id, req.body, req.auth.sub, req.writeBranch);
    res.status(200).json({ success: true, message: 'Supplier updated', data: { supplier } });
  } catch (error) {
    next(error);
  }
}

async function deleteSupplier(req, res, next) {
  try {
    await procurementService.deleteSupplier(req.params.id, req.auth.sub, req.writeBranch);
    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (error) {
    next(error);
  }
}

async function supplierPaymentAction(req, res, next) {
  try {
    // Supports credit payment workflows against a single supplier record.
    const result = await procurementService.supplierPaymentAction(req.params.id, req.body, req.auth.sub, req.writeBranch);
    res.status(200).json({
      success: true,
      message: `Supplier ${req.params.id} payment action saved`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function createPurchase(req, res, next) {
  try {
    const result = await procurementService.createPurchase(req.body, req.auth.sub, req.writeBranch);
    res.status(201).json({ success: true, message: 'Purchase recorded', data: result });
  } catch (error) {
    next(error);
  }
}

async function listPurchases(req, res, next) {
  try {
    const result = await procurementService.listPurchases(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getPurchaseById(req, res, next) {
  try {
    const purchase = await procurementService.getPurchaseById(req.params.id, req.readBranch);
    res.status(200).json({ success: true, data: { purchase } });
  } catch (error) {
    next(error);
  }
}

async function getStockReport(req, res, next) {
  try {
    const report = await procurementService.getStockReport(req.query, req.readBranch);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function getPurchaseReport(req, res, next) {
  try {
    const report = await procurementService.getPurchaseReport(req.query, req.readBranch);
    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

async function listProcurementReceipts(req, res, next) {
  try {
    const result = await procurementService.listProcurementReceipts(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function exportProcurementReports(req, res, next) {
  try {
    // Reuses report filters passed from query params.
    const exportedData = await procurementService.exportProcurementReports(req.query, req.readBranch);
    res.status(200).json({ success: true, data: exportedData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  listItems,
  createItem,
  addInventoryAdjustment,
  recordDamagedStock,
  listSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  supplierPaymentAction,
  createPurchase,
  listPurchases,
  getPurchaseById,
  getStockReport,
  getPurchaseReport,
  listProcurementReceipts,
  exportProcurementReports
};