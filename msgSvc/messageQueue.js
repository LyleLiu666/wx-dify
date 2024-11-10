import Redis from 'ioredis';

export class MessageQueue {
  constructor() {
    this.queueKey = 'wechat:message:queue';
    this.initRedis();
  }

  initRedis() {
    this.redis = new Redis({
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

    this.redis.on('error', (err) => {
      console.error('Redis 连接错误:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis 连接成功');
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis 正在重新连接...');
    });
  }

  async enqueue(message) {
    try {
      const result = await this.redis.rpush(this.queueKey, JSON.stringify(message));
      const len = await this.redis.llen(this.queueKey);
      console.log('消息入队列', result, len);
    } catch (error) {
      console.error('消息入队列失败:', error);
      throw error;
    }
  }

  async dequeue() {
    try {
      const message = await this.redis.lpop(this.queueKey);
      return message ? JSON.parse(message) : null;
    } catch (error) {
      console.error('消息出队列失败:', error);
      throw error;
    }
  }

  async isEmpty() {
    try {
      const length = await this.redis.llen(this.queueKey);
      console.log('isEmpty:', length);
      return length === 0;
    } catch (error) {
      console.error('检查队列状态失败:', error);
      throw error;
    }
  }
} 