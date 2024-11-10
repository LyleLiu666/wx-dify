import { FileBox } from 'file-box';

export class MessageProcessor {
  constructor(bot, messageQueue) {
    this.bot = bot;
    this.messageQueue = messageQueue;
  }

  async start() {
    setInterval(async () => {
      if (await this.messageQueue.isEmpty()) return;
      const message = await this.messageQueue.dequeue();
      if (message) {
        await this.sendMessage(message);
      }
    }, 3500);
  }

  async sendMessage(messageData) {
    try {
      // Validate contact first
      const contact = messageData.contact ? await this.bot.Contact.find({ id: messageData.contact }) : null;
      const room = messageData.roomId ? await this.bot.Room.find({ id: messageData.roomId }) : null;

      // 发送响应
      if (room) { // 如果有room，不管消息类型，都回复到群里
        for (const item of messageData.response) {
          if (item.type === 'text') {
            await room.say(item.content);
          } else if (item.type === 'image') {
            const fileBox = FileBox.fromBase64(item.content, item.filename);
            await room.say(fileBox);
          }
        }
      } else if (messageData.type === 'single' && contact) {
        for (const item of messageData.response) {
          if (item.type === 'text') {
            await contact.say(item.content);
          }
          else if (item.type === 'image') {
            const fileBox = FileBox.fromBase64(item.content, item.filename);
            await contact.say(fileBox);
          }
        }
      }
    } catch (error) {
      console.error('发送消息时出错:', error);
    }
  }
} 