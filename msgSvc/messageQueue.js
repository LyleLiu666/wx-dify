import { getRedisClient } from '../config/redisConfig.js';

export class MessageQueue {
  constructor() {
    this.queueKey = `wechat:${process.env.WECHAT_ID}:message:queue`;
    this.redis = getRedisClient();
  }

  async enqueue(message) {
    try {
      await this.redis.rpush(this.queueKey, JSON.stringify(message));
      console.log('消息入队成功');
    } catch (error) {
      console.error('消息入队列失败:', error);
      throw error;
    }
  }

  async dequeue() {
    try {
      const result = await this.redis.blpop(this.queueKey, 30);
      if (!result) return null;
      const message = result[1];
      const parsedMessage = JSON.parse(message);
      console.log('消息出队列');
      return parsedMessage;
    } catch (error) {
      console.error('消息出队列失败:', error);
      throw error;
    }
  }

  async isEmpty() {
    try {
      const length = await this.redis.llen(this.queueKey);
      return length === 0;
    } catch (error) {
      console.error('检查队列状态失败:', error);
      throw error;
    }
  }
} 