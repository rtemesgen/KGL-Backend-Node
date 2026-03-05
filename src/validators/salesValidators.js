function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateCreateCustomer(req) {
  const { name, tel, nin } = req.body || {};

  if (!hasValue(name)) {
    return 'name is required';
  }

  if (!hasValue(tel)) {
    return 'tel is required';
  }

  if (!hasValue(nin)) {
    return 'nin is required';
  }

  return null;
}

function validateUpdateCustomer(req) {
  const { name, tel, nin, address } = req.body || {};
  if (![name, tel, nin, address].some((value) => value !== undefined)) {
    return 'At least one field is required for update';
  }

  return null;
}

function validateCustomerPayment(req) {
  const { amount } = req.body || {};
  if (amount === undefined || amount === null) {
    return 'amount is required';
  }

  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return 'amount must be greater than zero';
  }

  return null;
}

function validateSaleLines(lines) {
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
  }

  return null;
}

function validateCreateCashSale(req) {
  return validateSaleLines((req.body || {}).lines);
}

function validateCreateCreditSale(req) {
  const { customerId, lines } = req.body || {};

  if (!hasValue(customerId)) {
    return 'customerId is required for credit sale';
  }

  return validateSaleLines(lines);
}

module.exports = {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateCustomerPayment,
  validateCreateCashSale,
  validateCreateCreditSale
};