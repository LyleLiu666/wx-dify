import { initDB, saveMessage, getRecentContext } from '../db/messageHistory.js';
import assert from 'assert';

async function runTests() {
  console.log('开始测试数据库操作...');

  try {
    // 初始化数据库
    await initDB();
    console.log('✓ 数据库初始化成功');
    const conversationId = '大大大'

    // 测试获取最近消息
    const recentMessages = await getRecentContext(conversationId, 50);
    console.log("recentMessages", recentMessages)
    
    
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runTests().catch(console.error); 