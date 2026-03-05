const Expense = require('../models/Expense');
const CreditCollection = require('../models/CreditCollection');
const OtherIncome = require('../models/OtherIncome');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');
const InventoryItem = require('../models/InventoryItem');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const DamagedStock = require('../models/DamagedStock');

// Reusable helper for date range queries.
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

function totalFromAggregate(rows) {
  // Aggregates may return an empty array.
  return rows[0]?.total || 0;
}

async function getFinancialSummary(query, branch) {
  // Pull all financial totals in parallel.
  const [salesAgg, expenseAgg, otherIncomeAgg, creditCollectionAgg, customerPaymentAgg] = await Promise.all([
    Sale.aggregate([{ $match: branch ? { branch, ...buildDateFilter(query.from, query.to, 'saleDate') } : buildDateFilter(query.from, query.to, 'saleDate') }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Expense.aggregate([{ $match: branch ? { branch, ...buildDateFilter(query.from, query.to, 'expenseDate') } : buildDateFilter(query.from, query.to, 'expenseDate') }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    OtherIncome.aggregate([{ $match: branch ? { branch, ...buildDateFilter(query.from, query.to, 'incomeDate') } : buildDateFilter(query.from, query.to, 'incomeDate') }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    CreditCollection.aggregate([
      { $match: branch ? { branch, ...buildDateFilter(query.from, query.to, 'collectionDate') } : buildDateFilter(query.from, query.to, 'collectionDate') },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]),
    CustomerPayment.aggregate([{ $match: branch ? { branch, ...buildDateFilter(query.from, query.to, 'paymentDate') } : buildDateFilter(query.from, query.to, 'paymentDate') }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);

  const totalSales = totalFromAggregate(salesAgg);
  const totalExpenses = totalFromAggregate(expenseAgg);
  const totalOtherIncome = totalFromAggregate(otherIncomeAgg);
  const totalCreditCollections = totalFromAggregate(creditCollectionAgg);
  const totalCustomerPayments = totalFromAggregate(customerPaymentAgg);

  return {
    totalSales,
    totalExpenses,
    totalOtherIncome,
    totalCreditCollections,
    totalCustomerPayments,
    netCashPosition: totalSales + totalOtherIncome + totalCreditCollections + totalCustomerPayments - totalExpenses
  };
}

async function getSalesSummary(query, branch) {
  const filter = {
    ...buildDateFilter(query.from, query.to, 'saleDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [byType, totals] = await Promise.all([
    Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$saleType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balanceDue' }
        }
      }
    ]),
    Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' }, totalPaid: { $sum: '$amountPaid' }, totalBalance: { $sum: '$balanceDue' } } }
    ])
  ]);

  return {
    totals: {
      count: totals[0]?.count || 0,
      totalAmount: totals[0]?.totalAmount || 0,
      totalPaid: totals[0]?.totalPaid || 0,
      totalBalance: totals[0]?.totalBalance || 0
    },
    byType
  };
}

async function getInventorySummary(query, branch) {
  const itemFilter = branch ? { branch } : {};
  const lowStockFilter = branch ? { branch, $expr: { $lt: ['$quantityOnHand', '$minQty'] } } : { $expr: { $lt: ['$quantityOnHand', '$minQty'] } };
  const outOfStockFilter = branch ? { branch, quantityOnHand: 0 } : { quantityOnHand: 0 };
  const inventoryMatch = branch ? { branch } : {};
  const adjustmentMatch = branch ? { branch, ...buildDateFilter(query.from, query.to, 'adjustedAt') } : buildDateFilter(query.from, query.to, 'adjustedAt');
  const damagedMatch = branch ? { branch, ...buildDateFilter(query.from, query.to, 'reportedAt') } : buildDateFilter(query.from, query.to, 'reportedAt');

  const [itemsCount, lowStockCount, outOfStockCount, inventoryValueAgg, adjustmentsAgg, damagedAgg] = await Promise.all([
    InventoryItem.countDocuments(itemFilter),
    InventoryItem.countDocuments(lowStockFilter),
    InventoryItem.countDocuments(outOfStockFilter),
    InventoryItem.aggregate([{ $match: inventoryMatch }, { $group: { _id: null, total: { $sum: { $multiply: ['$quantityOnHand', '$unitCost'] } } } }]),
    InventoryAdjustment.aggregate([
      { $match: adjustmentMatch },
      { $group: { _id: null, count: { $sum: 1 }, quantityChanged: { $sum: '$quantity' } } }
    ]),
    DamagedStock.aggregate([
      { $match: damagedMatch },
      { $group: { _id: null, count: { $sum: 1 }, quantity: { $sum: '$quantity' } } }
    ])
  ]);

  return {
    itemsCount,
    lowStockCount,
    outOfStockCount,
    inventoryValue: inventoryValueAgg[0]?.total || 0,
    adjustments: {
      count: adjustmentsAgg[0]?.count || 0,
      quantityChanged: adjustmentsAgg[0]?.quantityChanged || 0
    },
    damagedStock: {
      count: damagedAgg[0]?.count || 0,
      quantity: damagedAgg[0]?.quantity || 0
    }
  };
}

async function getReceivablesPayablesSummary(branch) {
  const customerMatch = branch ? { branch } : {};
  const supplierMatch = branch ? { branch } : {};
  const supplierPaymentMatch = branch ? { branch } : {};

  const [customerAgg, supplierAgg, customerCount, supplierCount, supplierPaymentsAgg] = await Promise.all([
    Customer.aggregate([{ $match: customerMatch }, { $group: { _id: null, total: { $sum: '$accountBalance' } } }]),
    Supplier.aggregate([{ $match: supplierMatch }, { $group: { _id: null, total: { $sum: '$balance' } } }]),
    Customer.countDocuments(customerMatch),
    Supplier.countDocuments(supplierMatch),
    SupplierPayment.aggregate([{ $match: supplierPaymentMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }])
  ]);

  return {
    totalCustomerReceivables: customerAgg[0]?.total || 0,
    totalSupplierPayables: supplierAgg[0]?.total || 0,
    totalSupplierPayments: supplierPaymentsAgg[0]?.total || 0,
    customersCount: customerCount,
    suppliersCount: supplierCount
  };
}

async function getTopSellingItems(query, branch) {
  const saleMatch = branch ? { branch, ...buildDateFilter(query.from, query.to, 'saleDate') } : buildDateFilter(query.from, query.to, 'saleDate');

  const rows = await Sale.aggregate([
    { $match: saleMatch },
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.sku',
        itemName: { $first: '$lines.itemName' },
        quantity: { $sum: '$lines.quantity' },
        revenue: { $sum: '$lines.lineTotal' }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: 10 }
  ]);

  return rows.map((row) => ({
    sku: row._id,
    itemName: row.itemName,
    quantity: row.quantity,
    revenue: row.revenue
  }));
}

async function getReportOverview(query, branch) {
  // Main overview combines multiple summary blocks.
  const [financial, sales, inventory, receivablesPayables, topSellingItems] = await Promise.all([
    getFinancialSummary(query, branch),
    getSalesSummary(query, branch),
    getInventorySummary(query, branch),
    getReceivablesPayablesSummary(branch),
    getTopSellingItems(query, branch)
  ]);

  return {
    period: {
      from: query.from || null,
      to: query.to || null
    },
    generatedAt: new Date().toISOString(),
    financial,
    sales,
    inventory,
    receivablesPayables,
    topSellingItems
  };
}

async function exportReports(query, branch) {
  // Export returns the overview plus raw datasets.
  const [overview, sales, expenses, creditCollections, otherIncome, customerPayments, supplierPayments] = await Promise.all([
    getReportOverview(query, branch),
    Sale.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'saleDate') } : buildDateFilter(query.from, query.to, 'saleDate')).sort({ saleDate: -1 }),
    Expense.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'expenseDate') } : buildDateFilter(query.from, query.to, 'expenseDate')).sort({ expenseDate: -1 }),
    CreditCollection.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'collectionDate') } : buildDateFilter(query.from, query.to, 'collectionDate')).sort({ collectionDate: -1 }),
    OtherIncome.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'incomeDate') } : buildDateFilter(query.from, query.to, 'incomeDate')).sort({ incomeDate: -1 }),
    CustomerPayment.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'paymentDate') } : buildDateFilter(query.from, query.to, 'paymentDate')).populate('customer', 'name tel nin').sort({ paymentDate: -1 }),
    SupplierPayment.find(branch ? { branch, ...buildDateFilter(query.from, query.to, 'paymentDate') } : buildDateFilter(query.from, query.to, 'paymentDate')).populate('supplier', 'name').sort({ paymentDate: -1 })
  ]);

  return {
    overview,
    datasets: {
      sales,
      expenses,
      creditCollections,
      otherIncome,
      customerPayments,
      supplierPayments
    }
  };
}

module.exports = {
  getReportOverview,
  exportReports
};