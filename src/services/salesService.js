const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');
const Sale = require('../models/Sale');
const InventoryItem = require('../models/InventoryItem');
const Customer = require('../models/Customer');
const CustomerPayment = require('../models/CustomerPayment');
const { createAuditEvent } = require('./auditService');
const { toBranchCode } = require('../config/branches');

// Reusable helper for optional date filtering.
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

function getStartAndEndOfDay(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function generateSaleNo(type, branch, session) {
  // Build a daily running number like CS-YYYYMMDD-0001.
  const prefix = type === 'cash' ? 'CS' : 'CR';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const count = await Sale.countDocuments({
    branch,
    saleType: type,
    saleDate: { $gte: todayStart, $lte: todayEnd }
  }).session(session);

  return `${prefix}-${toBranchCode(branch)}-${datePart}-${String(count + 1).padStart(4, '0')}`;
}

async function prepareSaleLines(lines, branch, session) {
  // Validate each line and load related inventory item.
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError(400, 'At least one line item is required');
  }

  const builtLines = [];

  for (const line of lines) {
    const item = await InventoryItem.findOne({ _id: line.itemId, branch }).session(session);
    if (!item) {
      throw new ApiError(404, `Item not found: ${line.itemId}`);
    }

    const quantity = Number(line.quantity);
    if (!quantity || quantity <= 0) {
      throw new ApiError(400, 'Line quantity must be greater than zero');
    }

    if (item.quantityOnHand < quantity) {
      throw new ApiError(400, `Insufficient stock for ${item.name}`);
    }

    const unitPrice = Number(line.unitPrice != null ? line.unitPrice : (item.sellingPrice ?? item.unitCost));
    if (unitPrice < 0) {
      throw new ApiError(400, 'Unit price cannot be negative');
    }

    builtLines.push({
      item,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice
    });
  }

  return builtLines;
}

async function applyInventoryDeduction(builtLines, session) {
  for (const line of builtLines) {
    line.item.quantityOnHand -= line.quantity;
    await line.item.save({ session });
  }
}

async function createSale(payload, saleType, userId, branch) {
  // Use one transaction so stock, sale, customer, and audit stay in sync.
  const session = await mongoose.startSession();
  let createdSale;

  try {
    await session.withTransaction(async () => {
      const builtLines = await prepareSaleLines(payload.lines, branch, session);
      const subTotal = builtLines.reduce((sum, line) => sum + line.lineTotal, 0);
      const discount = Number(payload.discount || 0);
      const totalAmount = Math.max(subTotal - discount, 0);
      const amountPaid = saleType === 'cash' ? totalAmount : Number(payload.amountPaid || 0);
      const balanceDue = Math.max(totalAmount - amountPaid, 0);

      if (amountPaid > totalAmount) {
        throw new ApiError(400, 'amountPaid cannot be greater than total amount');
      }

      if (saleType === 'cash' && amountPaid < totalAmount) {
        throw new ApiError(400, 'Cash sale must be fully paid');
      }

      let customer = null;

      if (saleType === 'credit') {
        if (!payload.customerId) {
          throw new ApiError(400, 'customerId is required for credit sales');
        }

        customer = await Customer.findOne({ _id: payload.customerId, branch }).session(session);

        if (!customer) {
          throw new ApiError(404, 'Customer not found');
        }
      }

      await applyInventoryDeduction(builtLines, session);

      const saleNo = await generateSaleNo(saleType, branch, session);
      const saleDocs = await Sale.create(
        [
          {
            saleNo,
            saleType,
            customer: customer?._id,
            customerName: customer ? customer.name : payload.customerName,
            customerPhone: customer ? customer.tel : payload.customerPhone,
            customerNin: customer ? customer.nin : payload.customerNin,
            lines: builtLines.map((line) => ({
              item: line.item._id,
              itemName: line.item.name,
              sku: line.item.sku,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal
            })),
            subTotal,
            discount,
            totalAmount,
            amountPaid,
            balanceDue,
            saleDate: payload.saleDate,
            note: payload.note,
            createdBy: userId,
            branch
          }
        ],
        { session }
      );

      createdSale = saleDocs[0];

      if (customer) {
        customer.totalCredit += totalAmount;
        customer.totalPaid += amountPaid;
        customer.accountBalance = Math.max(customer.totalCredit - customer.totalPaid, 0);
        await customer.save({ session });
      }

      await createAuditEvent(
        {
          module: 'sales',
          action: saleType === 'credit' ? 'credit-sale.created' : 'cash-sale.created',
          actor: userId,
          entityType: 'Sale',
          entityId: createdSale._id.toString(),
          metadata: {
            saleNo: createdSale.saleNo,
            saleType,
            customerId: customer?._id?.toString() || null,
            totalAmount,
            amountPaid,
            balanceDue
          },
          branch
        },
        { session }
      );
    });

    return createdSale;
  } finally {
    await session.endSession();
  }
}

async function listCustomers(query, branch) {
  const filter = branch ? { branch } : {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { tel: { $regex: query.search, $options: 'i' } },
      { nin: { $regex: query.search, $options: 'i' } }
    ];
  }

  const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(200);
  return { customers };
}

async function createCustomer(payload, userId, branch) {
  if (!payload.name || !payload.tel || !payload.nin) {
    throw new ApiError(400, 'name, tel, and nin are required');
  }

  const [existingTel, existingNin] = await Promise.all([
    Customer.findOne({ branch, tel: payload.tel.trim() }),
    Customer.findOne({ branch, nin: payload.nin.trim().toUpperCase() })
  ]);

  if (existingTel) {
    throw new ApiError(409, 'Customer with this tel already exists');
  }

  if (existingNin) {
    throw new ApiError(409, 'Customer with this nin already exists');
  }

  const customer = await Customer.create({
    name: payload.name,
    tel: payload.tel,
    nin: payload.nin,
    address: payload.address,
    createdBy: userId,
    branch
  });

  await createAuditEvent({
    module: 'sales',
    action: 'customer.created',
    actor: userId,
    entityType: 'Customer',
    entityId: customer._id.toString(),
    metadata: {
      name: customer.name,
      tel: customer.tel,
      nin: customer.nin
    },
    branch
  });

  return customer;
}

async function updateCustomer(customerId, payload, actorId, branch) {
  const customer = await Customer.findOne({ _id: customerId, branch });

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  if (payload.tel && payload.tel !== customer.tel) {
    const existingTel = await Customer.findOne({ branch, tel: payload.tel.trim(), _id: { $ne: customer._id } });
    if (existingTel) {
      throw new ApiError(409, 'Another customer with this tel already exists');
    }
  }

  if (payload.nin && payload.nin.toUpperCase() !== customer.nin) {
    const existingNin = await Customer.findOne({ branch, nin: payload.nin.trim().toUpperCase(), _id: { $ne: customer._id } });
    if (existingNin) {
      throw new ApiError(409, 'Another customer with this nin already exists');
    }
  }

  customer.name = payload.name ?? customer.name;
  customer.tel = payload.tel ?? customer.tel;
  customer.nin = payload.nin ?? customer.nin;
  customer.address = payload.address ?? customer.address;

  await customer.save();

  await createAuditEvent({
    module: 'sales',
    action: 'customer.updated',
    actor: actorId,
    entityType: 'Customer',
    entityId: customer._id.toString(),
    metadata: {
      updatedFields: Object.keys(payload || {})
    },
    branch
  });

  return customer;
}

async function deleteCustomer(customerId, actorId, branch) {
  const customer = await Customer.findOne({ _id: customerId, branch });

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  if (customer.accountBalance > 0) {
    throw new ApiError(400, 'Cannot delete customer with outstanding account balance');
  }

  const hasSales = await Sale.exists({ customer: customer._id, branch });
  if (hasSales) {
    throw new ApiError(400, 'Cannot delete customer linked to sales records');
  }

  await Customer.deleteOne({ _id: customerId, branch });

  await createAuditEvent({
    module: 'sales',
    action: 'customer.deleted',
    actor: actorId,
    entityType: 'Customer',
    entityId: customerId,
    metadata: {
      name: customer.name,
      tel: customer.tel,
      nin: customer.nin
    },
    branch
  });
}

async function addCustomerPayment(customerId, payload, userId, branch) {
  // Payment write and customer balance update happen together.
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const customer = await Customer.findOne({ _id: customerId, branch }).session(session);

      if (!customer) {
        throw new ApiError(404, 'Customer not found');
      }

      const amount = Number(payload.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, 'amount must be greater than zero');
      }

      if (customer.accountBalance <= 0) {
        throw new ApiError(400, 'Customer has no outstanding balance');
      }

      if (amount > customer.accountBalance) {
        throw new ApiError(400, 'Payment amount cannot exceed customer outstanding balance');
      }

      const paymentDocs = await CustomerPayment.create(
        [
          {
            customer: customer._id,
            amount,
            paymentMethod: payload.paymentMethod,
            reference: payload.reference,
            note: payload.note,
            paymentDate: payload.paymentDate,
            createdBy: userId,
            branch
          }
        ],
        { session }
      );

      customer.totalPaid += amount;
      customer.accountBalance = Math.max(customer.totalCredit - customer.totalPaid, 0);
      await customer.save({ session });

      await createAuditEvent(
        {
          module: 'sales',
          action: 'customer-payment.recorded',
          actor: userId,
          entityType: 'CustomerPayment',
          entityId: paymentDocs[0]._id.toString(),
          metadata: {
            customerId: customer._id.toString(),
            amount,
            remainingBalance: customer.accountBalance
          },
          branch
        },
        { session }
      );

      result = {
        payment: paymentDocs[0],
        customer
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function listCustomerPayments(customerId, query, branch) {
  const customerFilter = branch ? { _id: customerId, branch } : { _id: customerId };
  const customer = await Customer.findOne(customerFilter);

  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }

  const dateFilter = buildDateFilter(query.from, query.to, 'paymentDate');
  const paymentsFilter = {
    customer: customer._id,
    ...dateFilter
  };

  if (branch) {
    paymentsFilter.branch = branch;
  }

  const payments = await CustomerPayment.find(paymentsFilter).sort({ paymentDate: -1 });

  const totalPaidInRange = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return {
    customer,
    summary: {
      paymentCount: payments.length,
      totalPaidInRange
    },
    payments
  };
}

async function createCashSale(payload, userId, branch) {
  return createSale(payload, 'cash', userId, branch);
}

async function createCreditSale(payload, userId, branch) {
  return createSale(payload, 'credit', userId, branch);
}

async function getDashboard(query, branch) {
  // Dashboard combines totals and the latest sales list.
  const filter = {
    ...buildDateFilter(query.from, query.to, 'saleDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [summary, recentSales] = await Promise.all([
    Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$saleType',
          totalSalesAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalBalance: { $sum: '$balanceDue' },
          count: { $sum: 1 }
        }
      }
    ]),
    Sale.find(filter).sort({ saleDate: -1 }).limit(10)
  ]);

  const initial = {
    cash: { totalSalesAmount: 0, totalPaid: 0, totalBalance: 0, count: 0 },
    credit: { totalSalesAmount: 0, totalPaid: 0, totalBalance: 0, count: 0 }
  };

  for (const row of summary) {
    initial[row._id] = {
      totalSalesAmount: row.totalSalesAmount,
      totalPaid: row.totalPaid,
      totalBalance: row.totalBalance,
      count: row.count
    };
  }

  return {
    totals: {
      totalSalesAmount: initial.cash.totalSalesAmount + initial.credit.totalSalesAmount,
      totalPaid: initial.cash.totalPaid + initial.credit.totalPaid,
      totalBalance: initial.cash.totalBalance + initial.credit.totalBalance,
      totalCount: initial.cash.count + initial.credit.count
    },
    byType: initial,
    recentSales
  };
}

async function getDailySalesReport(query, branch) {
  const { start, end } = getStartAndEndOfDay(query.date);
  const filter = {
    saleDate: { $gte: start, $lte: end }
  };

  if (branch) {
    filter.branch = branch;
  }

  const sales = await Sale.find(filter).sort({ saleDate: -1 });

  const summary = sales.reduce(
    (acc, sale) => {
      acc.totalSales += sale.totalAmount;
      acc.totalPaid += sale.amountPaid;
      acc.totalBalance += sale.balanceDue;
      if (sale.saleType === 'cash') {
        acc.cashSales += sale.totalAmount;
      } else {
        acc.creditSales += sale.totalAmount;
      }
      return acc;
    },
    {
      date: start.toISOString().slice(0, 10),
      count: sales.length,
      totalSales: 0,
      totalPaid: 0,
      totalBalance: 0,
      cashSales: 0,
      creditSales: 0
    }
  );

  return {
    summary,
    sales
  };
}

async function exportSalesData(query, branch) {
  const filter = {
    ...buildDateFilter(query.from, query.to, 'saleDate')
  };

  if (branch) {
    filter.branch = branch;
  }

  const [dashboard, sales] = await Promise.all([
    getDashboard(query, branch),
    Sale.find(filter).sort({ saleDate: -1 })
  ]);

  return {
    dashboard,
    sales
  };
}

module.exports = {
  createCashSale,
  createCreditSale,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPayment,
  listCustomerPayments,
  getDashboard,
  getDailySalesReport,
  exportSalesData
};