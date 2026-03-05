const reportService = require('../services/reportService');

// Report controller is a thin wrapper around aggregated report services.
async function getReportOverview(req, res, next) {
  try {
    const overview = await reportService.getReportOverview(req.query, req.readBranch);
    res.status(200).json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
}

async function exportReports(req, res, next) {
  try {
    // Export output and scope are controlled by query parameters.
    const exportedData = await reportService.exportReports(req.query, req.readBranch);
    res.status(200).json({ success: true, data: exportedData });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReportOverview,
  exportReports
};