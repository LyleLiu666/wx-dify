import 'dotenv/config';
import { WechatyBuilder } from 'wechaty'
import { MessageQueue } from './msgSvc/messageQueue.js';
import { startHttpServer } from './httpServer.js';
import { MessageProcessor } from './msgSvc/messageProcessor.js';
import { FileBox } from 'file-box';
import { sendMessageToMattermost } from './mattermost.js';
import { handleMessage } from './msgSvc/messageHandler.js';
import { initDB } from './db/messageHistory.js';
import { getRedisClient } from './config/redisConfig.js';

const redisClient = getRedisClient();

const bot = WechatyBuilder.build({
  name: process.env.WECHATY_NAME || 'wechat-bot',
  // puppet: process.env.WECHATY_PUPPET,
});

const messageQueue = new MessageQueue();
const messageProcessor = new MessageProcessor(bot, messageQueue);
const whitelistKeywords = process.env.WHITELIST_KEYWORDS;
const roomWhiteList = process.env.ROOM_LIST ? process.env.ROOM_LIST.split(',') : [];
const vipRoomWhiteList = process.env.VIP_ROOM_LIST ? process.env.VIP_ROOM_LIST.split(',') : [];


async function main() {
  await initDB();

  bot
    .on('scan', (qrcode, status) => {
      console.log(`扫描二维码登录: ${status}\nhttps://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`);
    })
    .on('login', user => {
      console.log(`用户 ${user} 登录成功`);
      sendMessageToMattermost(`# 微信机器人登录成功\n用户: ${user}`);
    })
    .on('logout', async (user, reason) => {
      console.log(`用户 ${user} 登出: ${reason}`);
      await sendMessageToMattermost(`# 微信机器人已登出\n用户: ${user}\n原因: ${reason}`);
    })
    // .on('error', async (error) => {
    //   console.error('-------------\n机器人发生错误:', error);
    //   await sendMessageToMattermost(`# 微信机器人发生错误\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
    // })
    .on('disconnect', async (reason) => {
      console.log('机器人断开连接:', reason);
      await sendMessageToMattermost(`# 微信机器人断开连接\n原因: ${reason}`);
    })
    .on('stop', async () => {
      console.log('机器人已停止运行');
      await sendMessageToMattermost('# 微信机器人已停止运行');
    })
    .on('message', async message => {
      if (message.self()) return;
      // 获取当前用户(机器人自己)的contact对象
      const selfContact = bot.currentUser;

      const messageData = {
        type: 'single',
        messageId: message.id,
        from: message.talker().id,
        room: message.room()?.id,
        messageType: message.type(),
      };
      // 获取联系人和群信息
      const contact = message.talker();
      const room = message.room();
      if (!room && message.text() && message.text().includes("你仔细看看我是谁！")) {
        // 同步备注
        await contact.sync();
        return;
      }
      // 白名单
      const enableWhitelist = process.env.ENABLE_WHITELIST === 'true';


      const roomName = room ? await room.topic() : null;
      let roomInWhitelist, contactAlias, isVip;
      if (room) {
        roomInWhitelist = roomWhiteList.includes(roomName);
        isVip = vipRoomWhiteList ? vipRoomWhiteList.includes(roomName) : false;
      } else {
        const contactAliasCacheKey = `contact_alias:${contact.id}`;
        contactAlias = await redisClient.get(contactAliasCacheKey).then(async cached => {
          if (cached) return cached;
          await contact.sync();
          const alias = await contact.alias();
          await redisClient.set(contactAliasCacheKey, alias || '-', 'EX', 180); // 3分钟缓存
          return alias;
        });
      }
      const whitelist = enableWhitelist ? (room ? roomInWhitelist : contactAlias && contactAlias.includes(whitelistKeywords)) : true;

      const contactName = contact ? contact.name() : 'Unknown Contact'; // todo  有很多获取不到username的场景
      console.log(1, roomInWhitelist, 2, contactAlias, 3, message.type(), `${roomName ? `群: ${roomName},` : ''}from: ${contactName}---  ${whitelist}`);

      // 调用消息处理函数
      const response = await handleMessage({
        message,
        contactName,
        roomName,
        whitelist,
        isVip
      });
      if (!response) return;
      // 将消息和回复一起放入队列
      await messageQueue.enqueue({
        ...messageData,
        message,
        response,
        contact: contact.id,
        contactName,
        roomId: room?.id,
        roomName
      });
    });

  messageProcessor.start();
  startHttpServer(bot, messageQueue);
  await bot.start();
}

// 添加全局错误处理
process.on('uncaughtException', async (error) => {
  console.error('未捕获的异常:', error);
  await sendMessageToMattermost(`# 微信机器人发生未捕获的异常\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
  try {
    await sendMessageToMattermost(`# 微信机器人发生未处理的 Promise 拒绝\n\`\`\`\n${reason}\n\`\`\``);
  } catch (error) {
    console.error('Failed to send error to Mattermost:', error.message);
  }
});

main().catch(console.error);