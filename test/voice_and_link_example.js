const { createOpenAPI } = require('qq-guild-bot');

// 创建 client
const client = createOpenAPI({
  appID: '你的机器人 AppID', 
  token: '你的机器人 token',
  sandbox: false, // 沙箱环境设置为 true
});

async function sendVoiceAndLink(channelID) {
  try {
    // 方式1：发送语音文件消息（会显示为文件）
    const voiceFileMessage = {
      content: '',
      msg_id: '0',
      media: {
        url: 'https://example.com/path/to/voice.mp3'
      }
    };
    
    await client.messageApi.postMessage(channelID, voiceFileMessage);

    // 方式2：发送语音消息（可播放的语音消息）
    const voiceMessage = {
      content: '',
      msg_id: '0',
      message_type: 7, // 7 表示语音消息
      media: {
        url: 'https://example.com/path/to/voice.mp3'
      }
    };
    
    await client.messageApi.postMessage(channelID, voiceMessage);

    // 发送链接卡片消息
    const linkCardMessage = {
      content: '',
      msg_id: '0',
      ark: {
        template_id: 23,
        kv: [
          {
            key: '#PROMPT#',
            value: '这是一个链接卡片'
          },
          {
            key: '#LIST#',
            obj: [
              {
                obj_kv: [
                  {
                    key: 'desc',
                    value: '点击查看更多内容'
                  },
                  {
                    key: 'link',
                    value: 'https://example.com'
                  },
                  {
                    key: 'title',
                    value: '示例链接'
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    await client.messageApi.postMessage(channelID, linkCardMessage);
    
    console.log('消息发送成功！');
  } catch (error) {
    console.error('发送消息失败:', error);
  }
}

// 使用示例
const channelID = '目标子频道ID';
sendVoiceAndLink(channelID); 