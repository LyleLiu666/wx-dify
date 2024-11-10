import { FileBox } from 'file-box';
import * as PUPPET from 'wechaty-puppet';
import { saveMessage, getRecentContext } from '../db/messageHistory.js';
import { callDifyWorkflow, updateImage } from '../dify.js';



function getTypeName(typeId) {
    switch (typeId) {
        case PUPPET.types.Message.Text:
            return 'text';
        case PUPPET.types.Message.Image:
            return 'image';
        case PUPPET.types.Message.Audio:
            return 'audio';
        case PUPPET.types.Message.Video:
            return 'video';
        case PUPPET.types.Message.Contact:
            return 'contact';
        case PUPPET.types.Message.Emoticon:
            return 'emoticon';
        case PUPPET.types.Message.Location:
            return 'location';
        case PUPPET.types.Message.MiniProgram:
            return 'miniprogram';
        case PUPPET.types.Message.Url:
            return 'url';
        case PUPPET.types.Message.Attachment:
            return 'attachment';
        default:
            return 'unknown';
    }
}

async function handleMessage(_message) {
    try {
        // 获取会话ID和发送者
        const room = _message.message.room();
        const isInWhitelist = _message.whitelist;
        const conversationId = room ? await room.topic() : _message.message.talker().name();
        let text = _message.message.text();

        const atOrPrivate = (room && await _message.message.mentionSelf()) || (!room);

        // 如果不在白名单中，仅保存消息不处理
        if (!isInWhitelist) {
            console.log(`用户/群组 ${conversationId} 不在白名单中`);
            if (atOrPrivate) {
                return [{
                    type: 'text',
                    content: '转我主人66开始对话'
                }];
            }
            return null;
        }
        //saveMessage去掉所有at的人名,避免类似邮箱的字符串也被替换
        const mentionList = await _message.message.mentionList()
        for (let i of mentionList) {
            text = text.replace(`@${i.name()}`, '')
        }
        // 保存接收到的消息
        await saveMessage(
            conversationId,
            _message.message.talker().name(),
            getTypeName(_message.message.type()),
            text || ''
        );

        if (!atOrPrivate) {
            return null;
        }

        // 获取最近的上下文
        const context = await getRecentContext(conversationId);

        // 根据消息类型处理
        let response;
        switch (_message.message.type()) {
            case PUPPET.types.Message.Text:
                response = await handleTextMessage(_message, context);
                break;

            case PUPPET.types.Message.Image:
                response = await handleImageMessage(_message, context);
                break;

            case PUPPET.types.Message.Audio:
                response = await handleAudioMessage(_message, context);
                break;

            case PUPPET.types.Message.Video:
                response = await handleVideoMessage(_message, context);
                break;

            default:
                response = null;
        }

        if (!response) return;

        // 保存回复的消息
        for (const reply of response) {
            await saveMessage(
                conversationId,
                'npc(自己)',
                reply.type,
                reply.content
            );
        }

        return response;
    } catch (error) {
        console.error('处理消息时出错:', error);
        return [{
            type: 'text',
            content: '歇会儿，我撑着了'
        }];
    }
}

async function handleTextMessage(_message, context) {
    const message = _message.message;
    let text = message.text();
    if (!text) {
        return [{
            type: 'text',
            content: '吃了撑，缓缓..'
        }];
    }
    //去掉所有at的人名,以免类似邮箱的字符串也被替换
    const mentionList = await message.mentionList()
    for (let i of mentionList) {
        text = text.replace(`@${i.name()}`, '')
    }
    console.log("start handleTextMessage", text);
    // 继续处理普通消息
    const input = {
        user_msg: text,
        fromType: _message.roomId ? 'chatroom' : 'friend',
        from_user_name: _message.contactName,
        history_context: context.map(msg => `${msg.sender}: ${msg.content}`).toString().slice(-10240)
    };

    // 调用工作流
    const userId = message.room() ? message.room().id + "-" + _message.contactName : message.talker().id;
    const result = await callDifyWorkflow(userId, input);

    if (!result.success) {
        return [{
            type: 'text',
            content: result.error || '吃了撑，缓缓..'
        }];
    }
    const resData = result.data.data.outputs
    if (resData.reply) {
        const responseList = []
        if (resData.data) {
            responseList.push({
                type: 'text',
                content: resData.data
            });
        }

        if (resData.imgs && Array.isArray(resData.imgs)) {
            for (const imgUrl of resData.imgs) {
                try {
                    // 检查 imgUrl 是否是有效的 base64 字符串
                    if (!imgUrl || typeof imgUrl !== 'string') {
                        console.error('Invalid image URL:', imgUrl);
                        continue;
                    }
                    // import { FileBox }  from 'file-box'
                    // const fileBox1 = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
                    // const fileBox2 = FileBox.fromFile('/tmp/text.txt')
                    // await contact.say(fileBox1)
                    // await contact.say(fileBox2)

                    try {
                        // 如果已经是 base64 字符串，直接使用
                        const base64Data = imgUrl.startsWith('data:image/') ?
                            imgUrl.split(',')[1] :
                            await fetch(imgUrl)
                                .then(res => res.arrayBuffer())
                                .then(buffer => Buffer.from(buffer).toString('base64'));

                        responseList.push({
                            type: 'image',
                            content: base64Data,
                            filename: `image_${Date.now()}.png`
                        });
                    } catch (e) {
                        console.error('Invalid base64 data:', e);
                        continue;
                    }


                } catch (error) {
                    console.error('处理图片时出错:', error);
                    continue;
                }
            }
        }

        return responseList;
    }
}

// 其他处理函数也需要添加 context 参数
async function handleImageMessage(_message, context) {
    const message = _message.message;
    const image = await message.toFileBox();
    const base64Data = await image.toBase64();
    console.log("start handleImageMessage");
    // return [
    //     { 
    //         type: 'text', 
    //         content: '我收到了你的图片' 
    //     },
    //     {
    //         type: 'image',
    //         content: base64Data,
    //         filename: `reply_${image.name}`
    //     }
    // ];
    return null;
}

async function handleAudioMessage(message, context) {
    console.log("start handleImageMessage");
    // return [{ 
    //     type: 'text', 
    //     content: '收到语音消息'
    // }];
    return null;
}

async function handleVideoMessage(message, context) {
    console.log("start handleImageMessage");
    // return [{ 
    //     type: 'text', 
    //     content: '收到视频消息'
    // }];
    return null;
}

export {
    handleMessage
}; 