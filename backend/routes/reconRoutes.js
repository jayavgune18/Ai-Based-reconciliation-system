const express = require('express');
const router = express.Router();
const { 
  uploadAndIngest, 
  getJobs, 
  getMatchesByJob, 
  resolveMatch, 
  processInvoiceOCR,
  aiCompareMatch,
  getAiExecutiveSummary,
  explainAiAnomaly,
  createManualTransaction,
  getManualTransactions
} = require('../controllers/reconController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { upload, handleUpload } = require('../middlewares/uploadMiddleware');
const { checkReconUsageLimit } = require('../middlewares/usageLimitMiddleware');

// Config double file uploads for Reconciliation (Multer)
const uploadFields = handleUpload(upload.fields([
  { name: 'bankFile', maxCount: 1 },
  { name: 'internalFile', maxCount: 1 }
]));

router.post('/upload', protect, authorize('Admin', 'Finance Manager', 'Accountant'), checkReconUsageLimit, uploadLimiter, uploadFields, uploadAndIngest);
router.post('/ocr', protect, authorize('Admin', 'Finance Manager', 'Accountant'), uploadLimiter, handleUpload(upload.single('invoiceFile')), processInvoiceOCR);
router.get('/jobs', protect, getJobs);
router.get('/matches/:jobId', protect, getMatchesByJob);
router.put('/matches/:matchId/resolve', protect, authorize('Admin', 'Finance Manager', 'Accountant'), resolveMatch);

// AI & LLM Reconciliation Endpoints
router.post('/ai-match', protect, aiCompareMatch);
router.get('/ai-summary/:jobId', protect, getAiExecutiveSummary);
router.post('/ai-explain-anomaly', protect, explainAiAnomaly);

// Manual Ledger Transaction Ingestion & Listing
router.post('/manual-transaction', protect, authorize('Admin', 'Finance Manager', 'Accountant'), createManualTransaction);
router.get('/manual-transactions', protect, getManualTransactions);

module.exports = router;

