import { whitelistDB } from '../db/whitelistDB.js';

export const whitelist = {
    // 检查是否在白名单中
    // 示例:
    // const allowed = await whitelist.isAllowed('wxid_123', 'user'); // 检查用户
    // const allowed = await whitelist.isAllowed('12345@chatroom', 'room'); // 检查群组
    async isAllowed(id, type = 'user') {
        const enabled = await whitelistDB.isEnabled();
        if (!enabled) return true;
        
        return await whitelistDB.isInWhitelist(id, type);
    },

    // 添加到白名单
    // 示例:
    // await whitelist.add('wxid_123'); // 添加用户
    // await whitelist.add('12345@chatroom', 'room'); // 添加群组
    async add(id, type = 'user') {
        console.log(`添加到白名单: ${id} ${type}`);
        await whitelistDB.addToWhitelist(id, type);
    },

    // 从白名单中移除
    // 示例:
    // await whitelist.remove('wxid_123'); // 移除用户
    // await whitelist.remove('12345@chatroom'); // 移除群组
    async remove(id) {
        console.log(`从白名单中移除: ${id}`);
        await whitelistDB.removeFromWhitelist(id);
    },

    // 获取白名单列表
    // 示例:
    // const users = await whitelist.getList('user'); // 获取用户白名单
    // const rooms = await whitelist.getList('room'); // 获取群组白名单
    async getList(type) {
        console.log(`获取白名单列表: ${type}`);
        return await whitelistDB.getWhitelistByType(type);
    },

    // 设置白名单启用状态
    // 示例:
    // await whitelist.setEnabled(true); // 启用白名单
    // await whitelist.setEnabled(false); // 禁用白名单
    async setEnabled(enabled) {
        console.log(`设置白名单启用状态: ${enabled}`);
        await whitelistDB.setEnabled(enabled);
    }
}; 
