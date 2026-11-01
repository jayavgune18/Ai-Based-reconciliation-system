const Redis = require('ioredis');

// In-Memory cache fallback when Redis server is offline or unreachable
class MemoryCacheFallback {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = 300) {
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiry });
  }

  del(key) {
    this.store.delete(key);
  }

  delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  flush() {
    this.store.clear();
  }
}

const memoryFallback = new MemoryCacheFallback();
let redisClient = null;
let isConnected = false;

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying aggressively if Redis is not running locally
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue: false,
    lazyConnect: true
  });

  redisClient.connect().then(() => {
    isConnected = true;
    console.log(`⚡ Connected to Redis Server at ${redisUrl}`);
  }).catch((err) => {
    isConnected = false;
    console.warn(`ℹ️ Redis server not reachable (${err.message}). Using high-performance In-Memory cache fallback.`);
  });

  redisClient.on('connect', () => {
    isConnected = true;
    console.log('⚡ Redis connected successfully.');
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    // Suppress spamming logs when Redis is offline in standalone development
  });

  redisClient.on('close', () => {
    isConnected = false;
  });
} catch (err) {
  isConnected = false;
  console.warn('ℹ️ Redis initialization fallback to In-Memory cache.');
}

/**
 * Get cached value (JSON parsed)
 */
const getCache = async (key) => {
  try {
    if (isConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    // Failover to memory
  }
  return memoryFallback.get(key);
};

/**
 * Set cached value with TTL in seconds
 */
const setCache = async (key, value, ttlSeconds = 300) => {
  try {
    const serialized = JSON.stringify(value);
    if (isConnected && redisClient) {
      if (ttlSeconds) {
        await redisClient.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, serialized);
      }
      return;
    }
  } catch (err) {
    // Failover to memory
  }
  memoryFallback.set(key, value, ttlSeconds);
};

/**
 * Delete single cache key
 */
const deleteCache = async (key) => {
  try {
    if (isConnected && redisClient) {
      await redisClient.del(key);
    }
  } catch (err) {
    // Failover
  }
  memoryFallback.del(key);
};

/**
 * Delete keys matching wildcard pattern (e.g., 'dashboard:*')
 */
const deleteCachePattern = async (pattern) => {
  try {
    if (isConnected && redisClient) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch (err) {
    // Failover
  }
  memoryFallback.delPattern(pattern);
};

const isRedisConnected = () => isConnected;

module.exports = {
  redisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  isRedisConnected
};
