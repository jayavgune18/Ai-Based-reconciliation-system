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

const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null);

// Only attempt connecting to Redis if explicitly configured or in production/docker
if (process.env.REDIS_URL || process.env.REDIS_HOST) {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Stop retrying immediately if Redis is unreachable
        }
        return 1000;
      },
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 1500
    });

    redisClient.on('error', () => {
      isConnected = false;
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('⚡ Redis connected successfully.');
    });

    redisClient.on('close', () => {
      isConnected = false;
    });

    redisClient.connect().then(() => {
      isConnected = true;
      console.log(`⚡ Connected to Redis Server at ${redisUrl}`);
    }).catch(() => {
      isConnected = false;
      console.log('ℹ️ Redis server unreachable. Ultra-fast In-Memory cache & asynchronous queue active.');
    });
  } catch (err) {
    isConnected = false;
  }
} else {
  // Standalone development mode without REDIS_URL/REDIS_HOST
  console.log('ℹ️ Redis host not specified. Using high-performance In-Memory cache & in-process async queue.');
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
