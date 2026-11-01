const { Worker } = require('bullmq');
const { redisConnection } = require('../queues/reconQueue');
const ReconciliationJob = require('../models/ReconciliationJob');
const ReconciliationEngine = require('../services/aiMatcher');
const { notifyJobUpdate } = require('../config/socket');
const { deleteCachePattern } = require('../config/redis');

/**
 * Core processing logic for a reconciliation job
 * Used by both BullMQ Worker and In-Memory fallback
 */
const processReconJob = async (jobData) => {
  const { jobId } = jobData;
  console.log(`⚙️ Worker starting background reconciliation for Job ID: ${jobId}`);

  try {
    // Notify UI that job has been picked up
    notifyJobUpdate(jobId, {
      status: 'processing',
      progress: 5,
      message: 'Worker picked up job. Parsing and indexing statements...'
    });

    // Run AI Matching Engine
    const results = await ReconciliationEngine.runMatching(jobId);

    // Invalidate dashboard stats cache so newly reconciled stats reflect immediately
    await deleteCachePattern('dashboard:*');
    await deleteCachePattern('recon:*');

    // Notify completion
    notifyJobUpdate(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Reconciliation job successfully completed!',
      stats: results?.stats
    });

    console.log(`✅ Worker completed job ${jobId} successfully.`);
    return { success: true, jobId, stats: results?.stats };
  } catch (error) {
    console.error(`❌ Worker failed on job ${jobId}:`, error);

    await ReconciliationJob.findByIdAndUpdate(jobId, {
      status: 'failed',
      errorMessage: error.message
    });

    notifyJobUpdate(jobId, {
      status: 'failed',
      progress: 100,
      message: `Reconciliation processing failed: ${error.message}`
    });

    throw error;
  }
};

let reconWorker = null;

const initReconWorker = () => {
  const { isRedisConnected } = require('../config/redis');
  if (!isRedisConnected() || !redisConnection) {
    return null;
  }

  if (!reconWorker) {
    try {
      reconWorker = new Worker(
        'reconProcessingQueue',
        async (bullJob) => {
          return await processReconJob(bullJob.data);
        },
        {
          connection: redisConnection,
          concurrency: 3
        }
      );

      reconWorker.on('completed', (job) => {
        console.log(`🎉 BullMQ Worker: Job ${job.id} completed!`);
      });

      reconWorker.on('failed', (job, err) => {
        console.error(`💥 BullMQ Worker: Job ${job?.id} failed: ${err.message}`);
      });

      reconWorker.on('error', () => {}); // silence connection drops

      console.log('👷 BullMQ Worker listening on [reconProcessingQueue]');
    } catch (err) {
      reconWorker = null;
    }
  }
  return reconWorker;
};

// Try initializing worker on startup only if Redis is already connected
if (redisConnection) {
  const { isRedisConnected } = require('../config/redis');
  if (isRedisConnected()) {
    initReconWorker();
  }
}

module.exports = {
  processReconJob,
  initReconWorker
};
