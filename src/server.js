const path = require('path');
const dotenv = require('dotenv');

const nodeEnv = process.env.NODE_ENV || 'development';

// Load environment-specific overrides first, then fall back to shared defaults.
dotenv.config({ path: path.resolve(__dirname, '..', `.env.${nodeEnv}`), override: true });
dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const app = require('./app');
const { getEnv } = require('./config/env');
const { connectToDatabase } = require('./config/database');
const { ensureBootstrapAdminUser } = require('./services/bootstrapAdminService');

const env = getEnv();

async function startServer() {
  try {
    // Ensure DB connectivity before accepting HTTP traffic.
    await connectToDatabase();
    await ensureBootstrapAdminUser();

    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
