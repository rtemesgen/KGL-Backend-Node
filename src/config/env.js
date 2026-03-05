function getEnv() {
  // Keep all environment parsing/validation centralized.
  const port = Number(process.env.PORT) || 5000;
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '1d';
  const mongodbUri = process.env.MONGODB_URI;
  const bootstrapAdminName = process.env.BOOTSTRAP_ADMIN_NAME || 'System Admin';
  const bootstrapAdminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@karibu.local';
  const bootstrapAdminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@123';
  const bootstrapAdminBranch = process.env.BOOTSTRAP_ADMIN_BRANCH || 'Maganjo';
  const requireTransactions =
    // In production we default to strict transaction enforcement.
    process.env.REQUIRE_TRANSACTIONS != null
      ? String(process.env.REQUIRE_TRANSACTIONS).toLowerCase() === 'true'
      : (process.env.NODE_ENV || 'development') === 'production';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required in environment variables');
  }

  if (!mongodbUri) {
    throw new Error('MONGODB_URI is required in environment variables');
  }

  return {
    port,
    jwtSecret,
    jwtExpiresIn,
    mongodbUri,
    bootstrapAdminName,
    bootstrapAdminEmail,
    bootstrapAdminPassword,
    bootstrapAdminBranch,
    requireTransactions,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

module.exports = { getEnv };
