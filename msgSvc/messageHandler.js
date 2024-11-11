import { FileBox } from 'file-box';
import * as PUPPET from 'wechaty-puppet';
import { saveMessage, getRecentContext } from '../db/messageHistory.js';
import { callDifyWorkflow, updateImage as uploadImage } from '../dify.js';



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

        const at = room && await _message.message.mentionSelf()
        const atOrPrivate = at || (!room);

        // 如果不在白名单中，仅保存消息不处理
        if (!isInWhitelist) {
            console.log(`用户/群组 ${conversationId} 不在白名单中`);
            if (at) {
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
            const mention = `@${i.name()}`
            text = text.replace(mention, '')
        }
        // 保存接收到的消息
        if (_message.message.type() === PUPPET.types.Message.Text && text) {
            await saveMessage(
                conversationId,
                _message.message.talker().name(),
                getTypeName(PUPPET.types.Message.Text),
                text
            );
        } else if (_message.message.type() === PUPPET.types.Message.Image) {
            const message = _message.message;
            const imgFileBox = await message.toFileBox();
            const imgBuffer = await imgFileBox.toBuffer()

            const userId = message.room() ? message.room().id + "-" + _message.contactName : message.talker().id;

            const imgId = await uploadImage(userId, imgBuffer, imgFileBox.mediaType)

            await saveMessage(conversationId, _message.message.talker().name(),
                getTypeName(PUPPET.types.Message.Image), imgId);
        }


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
            if (reply.type == 'image') {
                // 如果是图片回复，需要先创建FileBox对象以便后续发送
                const imgFileBox = FileBox.fromUrl(reply.imgUrl);
                const imgBuffer = await imgFileBox.toBuffer()
                const userId = room ? room.id + "-" + _message.contactName : _message.message.talker().id;
                const imgId = await uploadImage(userId, imgBuffer, imgFileBox.mediaType)

                await saveMessage(conversationId, 'npc(自己)', 'image', imgId);
            } else if (reply.type == 'text') {
                await saveMessage(
                    conversationId,
                    'npc(自己)',
                    reply.type,
                    reply.content
                );
            }
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
    const isVip = _message.isVip;
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
        const alias = await i.alias();
        const mention = `@${i.name()}`
        text = text.replace(mention, '')
    }
    console.log("start handleTextMessage", text);
    // 继续处理普通消息
    const input = {
        isVip: isVip ? 1 : -99,
        user_msg: text,
        fromType: _message.message.room() ? 'chatroom' : 'friend',
        from_user_name: _message.contactName,
        history_context: context.filter(msg => msg.message_type === 'text').map(msg => `${msg.sender}: ${msg.content}`).join('\n\n').slice(-8000)
    };

    let files = [];
    const imgs = context.filter(msg => msg.message_type === 'image');

    const lastImage = imgs.slice(-1)[0];
    if (lastImage) {
        const imageId = lastImage.content;
        files.push({
            transfer_method: 'local_file',
            upload_file_id: imageId,
            type: 'image'
        });
    }

    // 调用工作流
    const userId = message.room() ? message.room().id + "-" + _message.contactName : message.talker().id;
    const result = await callDifyWorkflow(userId, input, files);

    if (!result.success) {
        return [{
            type: 'text',
            content: '吃了撑，缓缓..'
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
                            imgUrl: imgUrl
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