const { Queue } = require('bullmq');
const { redisClient, isRedisConnected } = require('../config/redis');

let reconQueue = null;
let reportQueue = null;

const redisConnection = (process.env.REDIS_URL || process.env.REDIS_HOST) ? {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
} : null;

const getReconQueue = () => {
  if (!isRedisConnected() || !redisConnection) return null;
  if (!reconQueue) {
    try {
      reconQueue = new Queue('reconProcessingQueue', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 200
        }
      });
      reconQueue.on('error', () => {}); // silence ioredis reconnection logs
      console.log('📦 BullMQ Queue active: reconProcessingQueue');
    } catch (err) {
      reconQueue = null;
    }
  }
  return reconQueue;
};

const getReportQueue = () => {
  if (!isRedisConnected() || !redisConnection) return null;
  if (!reportQueue) {
    try {
      reportQueue = new Queue('reportGenerationQueue', {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 2,
          removeOnComplete: 50,
          removeOnFail: 100
        }
      });
      reportQueue.on('error', () => {}); // silence ioredis reconnection logs
    } catch (err) {
      reportQueue = null;
    }
  }
  return reportQueue;
};

/**
 * Add Reconciliation Processing Job to BullMQ (or execute in background if Redis is offline)
 * @param {Object} jobData - { jobId, userId, bankTxns, internalTxns, jobName }
 */
const addReconciliationJob = async (jobData) => {
  const queue = getReconQueue();
  if (queue) {
    try {
      const bullJob = await queue.add('processReconciliation', jobData, {
        jobId: `recon_${jobData.jobId}`
      });
      console.log(`🚀 BullMQ: Enqueued recon job ${bullJob.id}`);
      return { queued: true, bullJobId: bullJob.id, mode: 'bullmq' };
    } catch (err) {
      console.warn(`BullMQ add failed (${err.message}). Falling back to in-process async worker.`);
    }
  }

  // Graceful In-Memory fallback: Execute via worker directly
  setImmediate(async () => {
    try {
      const { processReconJob } = require('../workers/reconWorker');
      await processReconJob(jobData);
    } catch (workerErr) {
      console.error('In-process recon worker failed:', workerErr);
    }
  });

  return { queued: true, mode: 'in_process_fallback' };
};

/**
 * Add Report Generation Job
 */
const addReportJob = async (reportData) => {
  const queue = getReportQueue();
  if (queue) {
    try {
      const bullJob = await queue.add('generateReport', reportData);
      return { queued: true, bullJobId: bullJob.id, mode: 'bullmq' };
    } catch (err) {
      console.warn(`BullMQ report queue failed (${err.message}). Running synchronously.`);
    }
  }

  return { queued: false, mode: 'sync' };
};

module.exports = {
  getReconQueue,
  getReportQueue,
  addReconciliationJob,
  addReportJob,
  redisConnection
};
