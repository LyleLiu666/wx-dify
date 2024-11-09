import { FileBox } from 'file-box';
import * as PUPPET from 'wechaty-puppet';
import { saveMessage, getRecentContext } from '../db/messageHistory.js';
import { callDifyWorkflow, updateImage } from '../dify.js';
import { whitelist } from '../config/whitelist.js';

// 在文件顶部添加管理员配置
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];

function isAdmin(userId) {
    return ADMIN_IDS.includes(userId);
}

async function handleMessage(message) {
    try {
        // 获取会话ID和发送者
        const room = message.message.room();
        const conversationId = room ? room.id : message.message.talker().id;

        // 检查白名单 - 添加 await
        const isInWhitelist = await (room ?
            whitelist.isAllowed(room.id, 'room') :
            whitelist.isAllowed(message.message.talker().id));

        // 保存接收到的消息
        await saveMessage(
            conversationId,
            message.message.talker().id,
            message.message.type(),
            message.message.text() || '[非文本消息]'
        );

        // 处理白名单管理命令
        const text = message.message.text();
        if (text && text.startsWith('/whitelist')) {
            return await handleWhitelistCommand(message.message);
        }
        // 如果不在白名单中，仅保存消息不处理
        if (!isInWhitelist) {
            console.log(`用户/群组 ${conversationId} 不在白名单中，跳过处理`);
            return [{
                type: 'text',
                content: '转我主人66开始对话'
            }];
        }

        if (room && !await message.message.mentionSelf()) {
            return null;
        }
        // 获取最近的上下文
        const context = await getRecentContext(conversationId);

        // 根据消息类型处理
        let response;
        switch (message.message.type()) {
            case PUPPET.types.Message.Text:
                response = await handleTextMessage(message, context);
                break;

            case PUPPET.types.Message.Image:
                response = await handleImageMessage(message, context);
                break;

            case PUPPET.types.Message.Audio:
                response = await handleAudioMessage(message, context);
                break;

            case PUPPET.types.Message.Video:
                response = await handleVideoMessage(message, context);
                break;

            default:
                response = null;
        }

        if (!response) return;

        // 保存回复的消息
        for (const reply of response) {
            await saveMessage(
                conversationId,
                'bot',
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
    const text = message.text();
    if (!text) {
        return [{
            type: 'text',
            content: '吃了撑，缓缓..'
        }];
    }

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

async function handleWhitelistCommand(message) {
    // 检查是否是管理员
    if (!isAdmin(message.talker().id)) {
        return [{
            type: 'text',
            content: '您没有权限执行此操作'
        }];
    }

    // 将连续空格替换为单个空格
    const text = message.text().replace(/\s+/g, ' ');

    let [cmd, action, id, type] = text.split(' ');
    if (!action || !id) {
        return [{
            type: 'text',
            content: '命令格式错误，请使用 /whitelist add <id> [type] 或 /whitelist remove <id> 或 /whitelist list [type]'
        }];
    } else if (action != 'list' && !type) {
        return [{
            type: 'text',
            content: '命令格式错误，请使用 /whitelist add <id> [type] 或 /whitelist remove <id> 或 /whitelist list [type]'
        }];
    } else if (action == 'list' && !id) {
        return [{
            type: 'text',
            content: '命令格式错误，请使用 /whitelist list [type]'
        }];
    }

    try {
        switch (action) {
            case 'add':
                await whitelist.add(id, type);
                return [{
                    type: 'text',
                    content: `已将 ${id} 添加到${type === 'room' ? '群组' : '用户'}白名单`
                }];

            case 'remove':
                await whitelist.remove(id);
                return [{
                    type: 'text',
                    content: `已将 ${id} 从白名单移除`
                }];

            case 'list':
                type = id;
                const list = await whitelist.getList(type);
                return [{
                    type: 'text',
                    content: `${type === 'room' ? '群组' : '用户'}白名单列表：\n${list.map(item => item.id).join('\n')}`
                }];

            case 'enable':
                await whitelist.setEnabled(true);
                return [{
                    type: 'text',
                    content: '已启用白名单'
                }];

            case 'disable':
                await whitelist.setEnabled(false);
                return [{
                    type: 'text',
                    content: '已禁用白名单'
                }];

            default:
                return [{
                    type: 'text',
                    content: '支持的命令：\n/whitelist add <id> [type]\n/whitelist remove <id>\n/whitelist list [type]\n/whitelist enable\n/whitelist disable'
                }];
        }
    } catch (error) {
        console.error('白名单操作失败:', error);
        return [{
            type: 'text',
            content: '操作失败：' + error.message
        }];
    }

}

// 其他处理函数也需要添加 context 参数
async function handleImageMessage(_message, context) {
    const message = _message.message;
    const image = await message.toFileBox();
    const base64Data = await image.toBase64();

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
    // return [{ 
    //     type: 'text', 
    //     content: '收到语音消息'
    // }];
    return null;
}

async function handleVideoMessage(message, context) {
    // return [{ 
    //     type: 'text', 
    //     content: '收到视频消息'
    // }];
    return null;
}

export {
    handleMessage
}; 