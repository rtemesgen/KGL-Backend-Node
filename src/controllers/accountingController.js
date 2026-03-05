const accountingService = require('../services/accountingService');

// Controllers stay thin: validation/business rules live in services.
async function getOverview(req, res, next) {
  try {
    const overview = await accountingService.getOverview(req.query, req.readBranch);
    res.status(200).json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
}

async function listExpenses(req, res, next) {
  try {
    const result = await accountingService.listExpenses(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createExpense(req, res, next) {
  try {
    // Use authenticated user id for audit ownership on created records.
    const expense = await accountingService.createExpense(req.body, req.auth.sub, req.branch);
    res.status(201).json({ success: true, message: 'Expense record created', data: { expense } });
  } catch (error) {
    next(error);
  }
}

async function deleteExpense(req, res, next) {
  try {
    await accountingService.deleteExpense(req.params.id, req.branch);
    res.status(200).json({ success: true, message: `Expense ${req.params.id} deleted` });
  } catch (error) {
    next(error);
  }
}

async function listCreditCollections(req, res, next) {
  try {
    const result = await accountingService.listCreditCollections(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createCreditCollection(req, res, next) {
  try {
    const creditCollection = await accountingService.createCreditCollection(req.body, req.auth.sub, req.branch);
    res.status(201).json({
      success: true,
      message: 'Credit collection record created',
      data: { creditCollection }
    });
  } catch (error) {
    next(error);
  }
}

async function listOtherIncome(req, res, next) {
  try {
    const result = await accountingService.listOtherIncome(req.query, req.readBranch);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createOtherIncome(req, res, next) {
  try {
    const otherIncome = await accountingService.createOtherIncome(req.body, req.auth.sub, req.branch);
    res.status(201).json({ success: true, message: 'Other income record created', data: { otherIncome } });
  } catch (error) {
    next(error);
  }
}

async function exportAccountingData(req, res, next) {
  try {
    // Export format and filters are derived from query params.
    const exportedData = await accountingService.exportAccountingData(req.query, req.readBranch);
    res.status(200).json({ success: true, data: exportedData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverview,
  listExpenses,
  createExpense,
  deleteExpense,
  listCreditCollections,
  createCreditCollection,
  listOtherIncome,
  createOtherIncome,
  exportAccountingData
};