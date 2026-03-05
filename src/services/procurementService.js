const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');
const InventoryItem = require('../models/InventoryItem');
const InventoryAdjustment = require('../models/InventoryAdjustment');
const DamagedStock = require('../models/DamagedStock');
const Supplier = require('../models/Supplier');
const SupplierPayment = require('../models/SupplierPayment');
const ProcurementPurchase = require('../models/ProcurementPurchase');
const { createAuditEvent } = require('./auditService');
const { toBranchCode } = require('../config/branches');

// Shared pagination helper with a safe max limit.
function parsePagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function buildDateFilter(from, to, fieldName) {
  // Reusable date range filter used by reports and lists.
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

async function generatePurchaseNo(branch, session) {
  // Build a daily running purchase number.
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const count = await ProcurementPurchase.countDocuments({
    branch,
    purchaseDate: { $gte: todayStart, $lte: todayEnd }
  }).session(session);

  return `PO-${toBranchCode(branch)}-${datePart}-${String(count + 1).padStart(4, '0')}`;
}

async function getOverview(query, branch) {
  const adjustmentFilter = buildDateFilter(query.from, query.to, 'adjustedAt');
  const damagedFilter = buildDateFilter(query.from, query.to, 'reportedAt');
  const itemFilter = branch ? { branch } : {};
  const lowStockFilter = branch ? { branch, $expr: { $lt: ['$quantityOnHand', '$minQty'] } } : { $expr: { $lt: ['$quantityOnHand', '$minQty'] } };
  const outOfStockFilter = branch ? { branch, quantityOnHand: 0 } : { quantityOnHand: 0 };
  const supplierFilter = branch ? { branch } : {};
  const adjustmentMatch = branch ? { branch, ...adjustmentFilter } : adjustmentFilter;
  const damagedMatch = branch ? { branch, ...damagedFilter } : damagedFilter;

  const [itemsCount, lowStockCount, outOfStockCount, suppliersCount, adjustments, damages] = await Promise.all([
    InventoryItem.countDocuments(itemFilter),
    InventoryItem.countDocuments(lowStockFilter),
    InventoryItem.countDocuments(outOfStockFilter),
    Supplier.countDocuments(supplierFilter),
    InventoryAdjustment.aggregate([
      { $match: adjustmentMatch },
      { $group: { _id: null, count: { $sum: 1 }, added: { $sum: { $cond: [{ $eq: ['$type', 'add'] }, '$quantity', 0] } } } }
    ]),
    DamagedStock.aggregate([
      { $match: damagedMatch },
      { $group: { _id: null, count: { $sum: 1 }, quantity: { $sum: '$quantity' } } }
    ])
  ]);

  return {
    inventory: {
      itemsCount,
      lowStockCount,
      outOfStockCount
    },
    suppliers: {
      suppliersCount
    },
    adjustments: {
      count: adjustments[0]?.count || 0,
      addedQuantity: adjustments[0]?.added || 0
    },
    damagedStock: {
      count: damages[0]?.count || 0,
      quantity: damages[0]?.quantity || 0
    }
  };
}

async function listItems(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = branch ? { branch } : {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { sku: { $regex: query.search, $options: 'i' } },
      { category: { $regex: query.search, $options: 'i' } }
    ];
  }

  if (query.lowStock === 'true') {
    filter.$expr = { $lt: ['$quantityOnHand', '$minQty'] };
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter)
  ]);

  return {
    items,
    pagination: { page, limit, total }
  };
}

async function createItem(payload, userId, branch) {
  if (!payload.name || !payload.sku) {
    throw new ApiError(400, 'name and sku are required');
  }

  const existingSku = await InventoryItem.findOne({ branch, sku: payload.sku.toUpperCase().trim() });
  if (existingSku) {
    throw new ApiError(409, 'An item with this SKU already exists');
  }

  const item = await InventoryItem.create({
    name: payload.name,
    sku: payload.sku,
    category: payload.category,
    quantityOnHand: payload.quantityOnHand || 0,
    minQty: payload.minQty || 0,
    unitCost: payload.unitCost || 0,
    sellingPrice: payload.sellingPrice || 0,
    note: payload.note,
    createdBy: userId,
    branch
  });

  await createAuditEvent({
    module: 'procurement',
    action: 'inventory-item.created',
    actor: userId,
    entityType: 'InventoryItem',
    entityId: item._id.toString(),
    metadata: {
      sku: item.sku,
      quantityOnHand: item.quantityOnHand,
      minQty: item.minQty
    },
    branch
  });

  return item;
}

async function addInventoryAdjustment(payload, userId, branch) {
  // Transaction keeps stock change and adjustment record consistent.
  const { itemId, type, quantity, reason, note, adjustedAt } = payload;

  if (!itemId || !type || quantity == null) {
    throw new ApiError(400, 'itemId, type, and quantity are required');
  }

  if (!['add', 'remove', 'set'].includes(type)) {
    throw new ApiError(400, 'Invalid adjustment type');
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const item = await InventoryItem.findOne({ _id: itemId, branch }).session(session);
      if (!item) {
        throw new ApiError(404, 'Inventory item not found');
      }

      const qty = Number(quantity);
      if (qty < 0) {
        throw new ApiError(400, 'quantity must be zero or greater');
      }

      if (type === 'add') {
        item.quantityOnHand += qty;
      } else if (type === 'remove') {
        if (item.quantityOnHand < qty) {
          throw new ApiError(400, 'Insufficient stock for remove adjustment');
        }
        item.quantityOnHand -= qty;
      } else {
        item.quantityOnHand = qty;
      }

      await item.save({ session });

      const adjustmentDocs = await InventoryAdjustment.create(
        [
          {
            item: item._id,
            type,
            quantity: qty,
            reason,
            note,
            adjustedAt,
            createdBy: userId,
            branch
          }
        ],
        { session }
      );

      result = {
        adjustment: adjustmentDocs[0],
        item
      };

      await createAuditEvent(
        {
          module: 'procurement',
          action: 'inventory.adjusted',
          actor: userId,
          entityType: 'InventoryAdjustment',
          entityId: adjustmentDocs[0]._id.toString(),
          metadata: {
            itemId: item._id.toString(),
            type,
            quantity: qty,
            newQuantityOnHand: item.quantityOnHand
          },
          branch
        },
        { session }
      );
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function recordDamagedStock(payload, userId, branch) {
  // Deduct stock and save damaged record in one transaction.
  const { itemId, quantity, reason, note, reportedAt } = payload;

  if (!itemId || quantity == null) {
    throw new ApiError(400, 'itemId and quantity are required');
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const item = await InventoryItem.findOne({ _id: itemId, branch }).session(session);
      if (!item) {
        throw new ApiError(404, 'Inventory item not found');
      }

      const qty = Number(quantity);
      if (qty <= 0) {
        throw new ApiError(400, 'quantity must be greater than zero');
      }

      if (item.quantityOnHand < qty) {
        throw new ApiError(400, 'Insufficient stock to mark as damaged');
      }

      item.quantityOnHand -= qty;
      await item.save({ session });

      const damagedDocs = await DamagedStock.create(
        [
          {
            item: item._id,
            quantity: qty,
            reason,
            note,
            reportedAt,
            createdBy: userId,
            branch
          }
        ],
        { session }
      );

      result = {
        damaged: damagedDocs[0],
        item
      };

      await createAuditEvent(
        {
          module: 'procurement',
          action: 'stock.damaged-recorded',
          actor: userId,
          entityType: 'DamagedStock',
          entityId: damagedDocs[0]._id.toString(),
          metadata: {
            itemId: item._id.toString(),
            quantity: qty,
            remainingQuantityOnHand: item.quantityOnHand
          },
          branch
        },
        { session }
      );
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function listSuppliers(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = branch ? { branch } : {};

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { phone: { $regex: query.search, $options: 'i' } }
    ];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Supplier.countDocuments(filter)
  ]);

  return {
    suppliers,
    pagination: { page, limit, total }
  };
}

async function createSupplier(payload, userId, branch) {
  if (!payload.name) {
    throw new ApiError(400, 'name is required');
  }

  const supplier = await Supplier.create({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    openingBalance: payload.openingBalance || 0,
    balance: payload.openingBalance || 0,
    createdBy: userId,
    branch
  });

  await createAuditEvent({
    module: 'procurement',
    action: 'supplier.created',
    actor: userId,
    entityType: 'Supplier',
    entityId: supplier._id.toString(),
    metadata: {
      name: supplier.name,
      openingBalance: supplier.openingBalance
    },
    branch
  });

  return supplier;
}

async function updateSupplier(supplierId, payload, userId, branch) {
  const supplier = await Supplier.findOne({ _id: supplierId, branch });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  supplier.name = payload.name ?? supplier.name;
  supplier.phone = payload.phone ?? supplier.phone;
  supplier.email = payload.email ?? supplier.email;
  supplier.address = payload.address ?? supplier.address;

  await supplier.save();

  await createAuditEvent({
    module: 'procurement',
    action: 'supplier.updated',
    actor: userId,
    entityType: 'Supplier',
    entityId: supplier._id.toString(),
    metadata: {
      updatedFields: Object.keys(payload || {})
    },
    branch
  });

  return supplier;
}

async function deleteSupplier(supplierId, userId, branch) {
  const supplier = await Supplier.findOne({ _id: supplierId, branch });

  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  if ((supplier.balance || 0) > 0) {
    throw new ApiError(400, 'Cannot delete supplier with outstanding balance');
  }

  const hasPayments = await SupplierPayment.exists({ supplier: supplier._id, branch });
  if (hasPayments) {
    throw new ApiError(400, 'Cannot delete supplier linked to payment records');
  }

  await Supplier.deleteOne({ _id: supplierId, branch });

  await createAuditEvent({
    module: 'procurement',
    action: 'supplier.deleted',
    actor: userId,
    entityType: 'Supplier',
    entityId: supplierId,
    metadata: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email
    },
    branch
  });
}

async function supplierPaymentAction(supplierId, payload, userId, branch) {
  // Payment write and supplier balance update happen together.
  if (payload.amount == null) {
    throw new ApiError(400, 'amount is required');
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const supplier = await Supplier.findOne({ _id: supplierId, branch }).session(session);
      if (!supplier) {
        throw new ApiError(404, 'Supplier not found');
      }

      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new ApiError(400, 'amount must be greater than zero');
      }

      if ((supplier.balance || 0) <= 0) {
        throw new ApiError(400, 'Supplier has no outstanding balance');
      }

      if (amount > supplier.balance) {
        throw new ApiError(400, 'Payment amount cannot exceed supplier outstanding balance');
      }

      supplier.balance = Math.max((supplier.balance || 0) - amount, 0);
      await supplier.save({ session });

      const paymentDocs = await SupplierPayment.create(
        [
          {
            supplier: supplier._id,
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

      result = {
        payment: paymentDocs[0],
        supplier
      };

      await createAuditEvent(
        {
          module: 'procurement',
          action: 'supplier-payment.recorded',
          actor: userId,
          entityType: 'SupplierPayment',
          entityId: paymentDocs[0]._id.toString(),
          metadata: {
            supplierId: supplier._id.toString(),
            amount,
            remainingBalance: supplier.balance
          },
          branch
        },
        { session }
      );
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function createPurchase(payload, userId, branch) {
  // End-to-end purchase flow runs in one transaction.
  if (!payload.supplierId || !payload.paymentType || !Array.isArray(payload.lines) || payload.lines.length === 0) {
    throw new ApiError(400, 'supplierId, paymentType, and lines are required');
  }

  if (!['cash', 'credit'].includes(payload.paymentType)) {
    throw new ApiError(400, 'paymentType must be cash or credit');
  }

  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const supplier = await Supplier.findOne({ _id: payload.supplierId, branch }).session(session);

      if (!supplier) {
        throw new ApiError(404, 'Supplier not found');
      }

      const builtLines = [];

      for (const line of payload.lines) {
        const item = await InventoryItem.findOne({ _id: line.itemId, branch }).session(session);

        if (!item) {
          throw new ApiError(404, `Inventory item not found: ${line.itemId}`);
        }

        const quantity = Number(line.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new ApiError(400, 'Each line quantity must be greater than zero');
        }

        const unitCost = Number(line.unitCost != null ? line.unitCost : item.unitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          throw new ApiError(400, 'Each line unitCost must be zero or greater');
        }

        const sellingPrice = Number(line.sellingPrice != null ? line.sellingPrice : (item.sellingPrice ?? unitCost));
        if (!Number.isFinite(sellingPrice) || sellingPrice < 0) {
          throw new ApiError(400, 'Each line sellingPrice must be zero or greater');
        }

        const lineTotal = quantity * unitCost;

        builtLines.push({
          item,
          quantity,
          unitCost,
          sellingPrice,
          lineTotal
        });
      }

      const subTotal = builtLines.reduce((sum, line) => sum + line.lineTotal, 0);
      const discount = Number(payload.discount || 0);
      const totalAmount = Math.max(subTotal - discount, 0);
      const amountPaid = payload.paymentType === 'cash' ? totalAmount : Number(payload.amountPaid || 0);

      if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        throw new ApiError(400, 'amountPaid must be zero or greater');
      }

      if (amountPaid > totalAmount) {
        throw new ApiError(400, 'amountPaid cannot be greater than totalAmount');
      }

      if (payload.paymentType === 'cash' && amountPaid < totalAmount) {
        throw new ApiError(400, 'Cash purchase must be fully paid');
      }

      const balanceDue = Math.max(totalAmount - amountPaid, 0);

      for (const line of builtLines) {
        line.item.quantityOnHand += line.quantity;
        if (line.unitCost !== line.item.unitCost) {
          line.item.unitCost = line.unitCost;
        }
        if (line.sellingPrice !== line.item.sellingPrice) {
          line.item.sellingPrice = line.sellingPrice;
        }
        await line.item.save({ session });
      }

      if (payload.paymentType === 'credit' && balanceDue > 0) {
        supplier.balance = (supplier.balance || 0) + balanceDue;
        await supplier.save({ session });
      }

      const purchaseNo = await generatePurchaseNo(branch, session);
      const purchaseDocs = await ProcurementPurchase.create(
        [
          {
            purchaseNo,
            supplier: supplier._id,
            supplierName: supplier.name,
            paymentType: payload.paymentType,
            lines: builtLines.map((line) => ({
              item: line.item._id,
              itemName: line.item.name,
              sku: line.item.sku,
              quantity: line.quantity,
              unitCost: line.unitCost,
              sellingPrice: line.sellingPrice,
              lineTotal: line.lineTotal
            })),
            subTotal,
            discount,
            totalAmount,
            amountPaid,
            balanceDue,
            purchaseDate: payload.purchaseDate,
            note: payload.note,
            createdBy: userId,
            branch
          }
        ],
        { session }
      );

      const purchase = purchaseDocs[0];

      if (amountPaid > 0) {
        await SupplierPayment.create(
          [
            {
              supplier: supplier._id,
              amount: amountPaid,
              paymentMethod: payload.paymentMethod,
              reference: payload.reference,
              note: payload.paymentType === 'cash' ? 'Full cash purchase payment' : 'Credit purchase initial payment',
              paymentDate: payload.purchaseDate,
              createdBy: userId,
              branch
            }
          ],
          { session }
        );
      }

      await createAuditEvent(
        {
          module: 'procurement',
          action: payload.paymentType === 'cash' ? 'purchase.cash-created' : 'purchase.credit-created',
          actor: userId,
          entityType: 'ProcurementPurchase',
          entityId: purchase._id.toString(),
          metadata: {
            purchaseNo,
            supplierId: supplier._id.toString(),
            totalAmount,
            amountPaid,
            balanceDue,
            itemCount: builtLines.length
          },
          branch
        },
        { session }
      );

      result = {
        purchase,
        supplier
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
}

async function listPurchases(query, branch) {
  const { page, limit, skip } = parsePagination(query);
  const filter = branch ? { branch } : {};

  if (query.supplierId) {
    filter.supplier = query.supplierId;
  }

  if (query.paymentType) {
    filter.paymentType = query.paymentType;
  }

  Object.assign(filter, buildDateFilter(query.from, query.to, 'purchaseDate'));

  const [purchases, total] = await Promise.all([
    ProcurementPurchase.find(filter).sort({ purchaseDate: -1 }).skip(skip).limit(limit),
    ProcurementPurchase.countDocuments(filter)
  ]);

  return {
    purchases,
    pagination: { page, limit, total }
  };
}

async function getPurchaseById(purchaseId, branch) {
  const purchaseFilter = branch ? { _id: purchaseId, branch } : { _id: purchaseId };
  const purchase = await ProcurementPurchase.findOne(purchaseFilter)
    .populate('supplier', 'name phone email balance')
    .populate('lines.item', 'name sku quantityOnHand unitCost sellingPrice');

  if (!purchase) {
    throw new ApiError(404, 'Purchase not found');
  }

  return purchase;
}

async function getStockReport(query, branch) {
  const filter = branch ? { branch } : {};
  if (query.search) {
    filter.$or = [{ name: { $regex: query.search, $options: 'i' } }, { sku: { $regex: query.search, $options: 'i' } }];
  }

  const items = await InventoryItem.find(filter).sort({ name: 1 });

  const summary = {
    totalItems: items.length,
    lowStockItems: items.filter((item) => item.quantityOnHand < item.minQty).length,
    outOfStockItems: items.filter((item) => item.quantityOnHand === 0).length
  };

  return {
    summary,
    items
  };
}

async function getPurchaseReport(query, branch) {
  const filter = {
    ...buildDateFilter(query.from, query.to, 'purchaseDate')
  };

  if (branch) {
    filter.branch = branch;
  }
  const purchases = await ProcurementPurchase.find(filter)
    .populate('supplier', 'name')
    .sort({ purchaseDate: -1 });

  const totalPurchasedQty = purchases.reduce((sum, record) => {
    return sum + record.lines.reduce((inner, line) => inner + line.quantity, 0);
  }, 0);

  const totalPurchaseValue = purchases.reduce((sum, record) => sum + record.totalAmount, 0);
  const totalOutstandingCredit = purchases
    .filter((record) => record.paymentType === 'credit')
    .reduce((sum, record) => sum + record.balanceDue, 0);

  return {
    summary: {
      totalEntries: purchases.length,
      totalPurchasedQty,
      totalPurchaseValue,
      totalOutstandingCredit
    },
    purchases
  };
}

async function listProcurementReceipts(query, branch) {
  const filter = {
    ...buildDateFilter(query.from, query.to, 'paymentDate')
  };

  if (branch) {
    filter.branch = branch;
  }
  const receipts = await SupplierPayment.find(filter)
    .populate('supplier', 'name')
    .sort({ paymentDate: -1 });

  return {
    receipts
  };
}

async function exportProcurementReports(query, branch) {
  // Export bundles overview and detailed report datasets.
  const [overview, stockReport, purchaseReport, receipts] = await Promise.all([
    getOverview(query, branch),
    getStockReport(query, branch),
    getPurchaseReport(query, branch),
    listProcurementReceipts(query, branch)
  ]);

  return {
    overview,
    stockReport,
    purchaseReport,
    receipts
  };
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