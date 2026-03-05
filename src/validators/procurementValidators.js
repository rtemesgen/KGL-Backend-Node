function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateCreateSupplier(req) {
  if (!hasValue((req.body || {}).name)) {
    return 'name is required';
  }

  return null;
}

function validateUpdateSupplier(req) {
  const { name, phone, email, address } = req.body || {};
  if (![name, phone, email, address].some((value) => value !== undefined)) {
    return 'At least one supplier field is required for update';
  }

  return null;
}

function validateSupplierPayment(req) {
  const amount = (req.body || {}).amount;
  if (amount === undefined || amount === null) {
    return 'amount is required';
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return 'amount must be greater than zero';
  }

  return null;
}

function validateCreatePurchase(req) {
  const { supplierId, paymentType, lines } = req.body || {};

  if (!hasValue(supplierId)) {
    return 'supplierId is required';
  }

  if (!['cash', 'credit'].includes(paymentType)) {
    return 'paymentType must be cash or credit';
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return 'lines must be a non-empty array';
  }

  for (const line of lines) {
    if (!hasValue(line.itemId)) {
      return 'Each line must include itemId';
    }

    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) {
      return 'Each line quantity must be greater than zero';
    }

    if (line.sellingPrice !== undefined && (!Number.isFinite(Number(line.sellingPrice)) || Number(line.sellingPrice) < 0)) {
      return 'Each line sellingPrice must be zero or greater';
    }
  }

  return null;
}

module.exports = {
  validateCreateSupplier,
  validateUpdateSupplier,
  validateSupplierPayment,
  validateCreatePurchase
};