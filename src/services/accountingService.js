const ApiError = require('../utils/apiError');
const Expense = require('../models/Expense');
const CreditCollection = require('../models/CreditCollection');
const OtherIncome = require('../models/OtherIncome');

// Build a date range filter only when at least one date is given.
function buildDateFilter(from, to, fieldName) {
  if (!from && !to) {
    return {};
  }

  const range = {};

  if (from) {
    range.$gte = new Date(from);
  }

  if (to) {
    range.$lte = new Date(to);
  }

  return {
    [fieldName]: range
  };
}

function parsePagination(query) {
  // Keep page and limit in a safe range.
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

async function getOverview(filters, branch) {
  // Run all totals in parallel for faster dashboard response.
  const expenseFilter = buildDateFilter(filters.from, filters.to, 'expenseDate');
  const collectionFilter = buildDateFilter(filters.from, filters.to, 'collectionDate');
  const incomeFilter = buildDateFilter(filters.from, filters.to, 'incomeDate');

  const [expenseTotals, collectionTotals, incomeTotals] = await Promise.all([
    Expense.aggregate([
      { $match: branch ? { branch, ...expenseFilter } : expenseFilter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    CreditCollection.aggregate([
      { $match: branch ? { branch, ...collectionFilter } : collectionFilter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    OtherIncome.aggregate([
      { $match: branch ? { branch, ...incomeFilter } : incomeFilter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  const totalExpenses = expenseTotals[0]?.total || 0;
  const totalCreditCollections = collectionTotals[0]?.total || 0;
  const totalOtherIncome = incomeTotals[0]?.total || 0;

  return {
    totalExpenses,
    totalCreditCollections,
    totalOtherIncome,
    netBalance: totalCreditCollections + totalOtherIncome - totalExpenses,
    counts: {
      expenses: expenseTotals[0]?.count || 0,
      creditCollections: collectionTotals[0]?.count || 0,
      otherIncome: incomeTotals[0]?.count || 0
    }
  };
}

async function listExpenses(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    ...buildDateFilter(query.from, query.to, 'expenseDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [items, total] = await Promise.all([
    Expense.find(filter).sort({ expenseDate: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter)
  ]);

  return {
    items,
    pagination: { page, limit, total }
  };
}

async function createExpense(payload, userId, branch) {
  if (!payload.title || payload.amount == null) {
    throw new ApiError(400, 'title and amount are required');
  }

  return Expense.create({
    title: payload.title,
    amount: payload.amount,
    category: payload.category,
    note: payload.note,
    expenseDate: payload.expenseDate,
    createdBy: userId,
    branch
  });
}

async function deleteExpense(expenseId, branch) {
  const deleted = await Expense.findOneAndDelete({ _id: expenseId, branch });
  if (!deleted) {
    throw new ApiError(404, 'Expense not found');
  }
}

async function listCreditCollections(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    ...buildDateFilter(query.from, query.to, 'collectionDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [items, total] = await Promise.all([
    CreditCollection.find(filter).sort({ collectionDate: -1 }).skip(skip).limit(limit),
    CreditCollection.countDocuments(filter)
  ]);

  return {
    items,
    pagination: { page, limit, total }
  };
}

async function createCreditCollection(payload, userId, branch) {
  if (!payload.customerName || payload.amount == null) {
    throw new ApiError(400, 'customerName and amount are required');
  }

  return CreditCollection.create({
    customerName: payload.customerName,
    amount: payload.amount,
    paymentMethod: payload.paymentMethod,
    reference: payload.reference,
    collectionDate: payload.collectionDate,
    createdBy: userId,
    branch
  });
}

async function listOtherIncome(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    ...buildDateFilter(query.from, query.to, 'incomeDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [items, total] = await Promise.all([
    OtherIncome.find(filter).sort({ incomeDate: -1 }).skip(skip).limit(limit),
    OtherIncome.countDocuments(filter)
  ]);

  return {
    items,
    pagination: { page, limit, total }
  };
}

async function createOtherIncome(payload, userId, branch) {
  if (!payload.source || payload.amount == null) {
    throw new ApiError(400, 'source and amount are required');
  }

  return OtherIncome.create({
    source: payload.source,
    amount: payload.amount,
    note: payload.note,
    incomeDate: payload.incomeDate,
    createdBy: userId,
    branch
  });
}

async function exportAccountingData(query, branch) {
  // Export returns both summary and full records for the selected range.
  const expenseFilter = buildDateFilter(query.from, query.to, 'expenseDate');
  const collectionFilter = buildDateFilter(query.from, query.to, 'collectionDate');
  const incomeFilter = buildDateFilter(query.from, query.to, 'incomeDate');

  const [expenses, creditCollections, otherIncome, overview] = await Promise.all([
    Expense.find(branch ? { branch, ...expenseFilter } : expenseFilter).sort({ expenseDate: -1 }),
    CreditCollection.find(branch ? { branch, ...collectionFilter } : collectionFilter).sort({ collectionDate: -1 }),
    OtherIncome.find(branch ? { branch, ...incomeFilter } : incomeFilter).sort({ incomeDate: -1 }),
    getOverview(query, branch)
  ]);

  return {
    overview,
    expenses,
    creditCollections,
    otherIncome
  };
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