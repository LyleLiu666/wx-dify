import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';

export async function startHttpServer(bot, messageQueue) {
  const app = new Koa();
  const router = new Router();

  app.use(bodyParser());

  router.post('/send/broadcast', async (ctx) => {
    const { message, roomIds, contactIds } = ctx.request.body;
    
    if (!message || (!roomIds && !contactIds) || 
        (roomIds && !Array.isArray(roomIds)) ||
        (contactIds && !Array.isArray(contactIds))) {
      ctx.status = 400;
      ctx.body = { error: '参数错误' };
      return;
    }

    try {
      // 发送到群
      if (roomIds) {
        for (const roomId of roomIds) {
          await messageQueue.enqueue({
            type: 'group',
            text: message,
            room: roomId,
          });
        }
      }

      // 发送到个人
      if (contactIds) {
        for (const contactId of contactIds) {
          await messageQueue.enqueue({
            type: 'single',
            text: message,
            from: contactId,
          });
        }
      }

      ctx.body = { success: true };
    } catch (error) {
      console.error('群发消息出错:', error);
      ctx.status = 500;
      ctx.body = { error: '发送失败' };
    }
  });

  app.use(router.routes());
  app.listen(process.env.PORT || 3000);
} 