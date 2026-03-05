const mongoose = require('mongoose');
const { getEnv } = require('./env');

const databaseStatus = {
  connected: false,
  transactionSupport: null,
  transactionRequired: null,
  message: 'Database not connected yet'
};

async function assertTransactionSupport() {
  // Probe transaction capability using a short write+rollback style flow.
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await mongoose.connection.db.collection('__tx_support_probe').insertOne(
        { createdAt: new Date() },
        { session }
      );

      await mongoose.connection.db.collection('__tx_support_probe').deleteMany({}, { session });
    });
  } catch (error) {
    throw new Error(
      `MongoDB deployment does not support transactions. Use a replica set or MongoDB Atlas cluster. Details: ${error.message}`
    );
  } finally {
    await session.endSession();
  }
}

async function connectToDatabase() {
  const env = getEnv();
  databaseStatus.transactionRequired = env.requireTransactions;

  // Open Mongo connection before route handlers start serving requests.
  await mongoose.connect(env.mongodbUri);
  console.log('Connected to MongoDB');
  databaseStatus.connected = true;
  databaseStatus.message = 'Connected to MongoDB';

  try {
    // Verify runtime deployment supports MongoDB transactions.
    await assertTransactionSupport();
    console.log('MongoDB transaction support verified');
    databaseStatus.transactionSupport = true;
    databaseStatus.message = 'Connected with transaction support';
  } catch (error) {
    databaseStatus.transactionSupport = false;
    databaseStatus.message = error.message;

    if (env.requireTransactions) {
      // Hard-fail when strict transactional guarantees are required.
      throw error;
    }

    console.warn(`WARNING: ${error.message}`);
    console.warn('WARNING: Transaction-protected operations may fail on this MongoDB deployment.');
  }
}

function getDatabaseStatus() {
  return {
    ...databaseStatus
  };
}

module.exports = {
  connectToDatabase,
  getDatabaseStatus
};