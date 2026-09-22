import Redis from 'ioredis';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Retry with incremental backoff, capping at 3 seconds
    const delay = Math.min(times * 200, 3000);
    if (times > 10) {
      console.warn('⚠️ [Redis] Retry limit reached. Operations will fail gracefully without crashing.');
      return null; // Stop retrying after 10 attempts
    }
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  enableOfflineQueue: true,
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('Redis client is ready');
});

redisClient.on('error', (err) => {
  console.warn('⚠️ [Redis Warning]:', err.message || err);
});
