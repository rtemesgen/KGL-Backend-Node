const express = require('express');
const authRoutes = require('./authRoutes');
const accountingRoutes = require('./accountingRoutes');
const procurementRoutes = require('./procurementRoutes');
const salesRoutes = require('./salesRoutes');
const reportRoutes = require('./reportRoutes');
const usersRoutes = require('./usersRoutes');
const { getDatabaseStatus } = require('../config/database');

const router = express.Router();

// Lightweight liveness/readiness endpoint used by monitoring and health checks.
router.get('/health', (req, res) => {
  const database = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'Backend is running',
    data: {
      database
    }
  });
});

// Feature route groups.
router.use('/auth', authRoutes);
router.use('/accounting', accountingRoutes);
router.use('/procurement', procurementRoutes);
router.use('/sales', salesRoutes);
router.use('/report', reportRoutes);
router.use('/users', usersRoutes);

module.exports = router;
