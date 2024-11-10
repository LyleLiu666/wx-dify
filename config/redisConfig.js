import Redis from 'ioredis';

let redisClient = null;

export function initRedis() {
  if (redisClient) return redisClient;
  
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 1000, 5000);
      console.log(`Redis 连接失败，${delay}ms 后重试...`);
      return delay;
    },
    maxRetriesPerRequest: 3
  });

  redisClient.on('error', (err) => {
    console.error('Redis 连接错误:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis 连接成功');
  });

  redisClient.on('reconnecting', () => {
    console.log('Redis 正在重新连接...');
  });

  return redisClient;
}

export function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
} 