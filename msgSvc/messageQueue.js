import Redis from 'ioredis';

export class MessageQueue {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });
    this.queueKey = 'wechat:message:queue';
  }

  async enqueue(message) {

    await this.redis.rpush(this.queueKey, JSON.stringify(message));
  }

  async dequeue() {
    const message = await this.redis.lpop(this.queueKey);
    return message ? JSON.parse(message) : null;
  }

  async isEmpty() {
    const length = await this.redis.llen(this.queueKey);
    return length === 0;
  }
} 