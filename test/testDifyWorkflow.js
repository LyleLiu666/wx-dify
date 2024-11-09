import 'dotenv/config';
import { callDifyWorkflow, updateImage } from '../dify.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testWorkflow() {
    console.log('开始测试 Dify 工作流...');

    // 模拟历史上下文
    const mockHistory = [
        { sender: 'user1', content: '今天天气真好' },
        { sender: 'bot', content: '是的，阳光明媚' },
        { sender: 'user1', content: '我们去散步吧' }
    ];

    // 测试1: 基础文本输入
    console.log('\n测试1: 基础文本输入');
    const result1 = await callDifyWorkflow(
        'test-user-1',
        {
            user_msg: '@N小PC 介绍一下自己',
            fromType: 'chatroom',
            from_user_name: '主人-刘栉风',
            history_context: mockHistory.map(msg => `${msg.sender}: ${msg.content}`).toString()
        }
    );
    console.log('测试1结果:', JSON.stringify(result1, null, 2));

    // 测试2: 带图片的工作流
    console.log('\n测试2: 带图片的工作流');
    try {
        // 读取测试图片
        const imagePath = join(__dirname, 'test-image.png');
        const imageBuffer = readFileSync(imagePath);
        
        // 先上传图片
        const imageId = await updateImage('test-user-2', imageBuffer, 'image/jpeg');
        
        if (!imageId) {
            console.error('图片上传失败');
            return;
        }

        // 调用工作流
        const result2 = await callDifyWorkflow(
            'test-user-2', 
            {
                user_msg: '这张图片是什么？',
                fromType: 'friend',
                from_user_name: '图片测试用户',
                history_context: mockHistory.map(msg => `${msg.sender}: ${msg.content}`).toString()
            },
            [{
                type: 'image',
                transfer_method: 'local_file',
                upload_file_id: imageId
            }]
        );
        console.log('测试2结果:', JSON.stringify(result2, null, 2));
    } catch (error) {
        console.error('图片测试失败:', error);
    }
}

// 运行测试
testWorkflow().catch(error => {
    console.error('测试过程中发生错误:', error);
}).finally(() => {
    console.log('\n测试完成');
}); 