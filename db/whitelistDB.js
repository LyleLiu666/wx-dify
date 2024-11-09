import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DB_CONFIG } from '../config/dbConfig.js';

let db;

export const whitelistDB = {
    async init() {
        console.log('初始化白名单数据库:', DB_CONFIG.whitelistDB);
        // 初始化数据库连接
        db = await open({
            filename: DB_CONFIG.whitelistDB,
            driver: sqlite3.Database
        });

        // 创建白名单表
        await db.exec(`
            CREATE TABLE IF NOT EXISTS whitelist (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS whitelist_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // 初始化enabled配置
        const enabled = await db.get('SELECT value FROM whitelist_config WHERE key = ?', ['enabled']);
        if (!enabled) {
            await db.run('INSERT INTO whitelist_config (key, value) VALUES (?, ?)', ['enabled', 'true']);
        }
    },

    async addToWhitelist(id, type) {
        console.log('添加白名单:', id, type);
        await db.run('INSERT OR REPLACE INTO whitelist (id, type) VALUES (?, ?)', [id, type]);
    },

    async removeFromWhitelist(id) {
        await db.run('DELETE FROM whitelist WHERE id = ?', [id]);
    },

    async isInWhitelist(id, type) {
        const result = await db.get('SELECT id FROM whitelist WHERE id = ? AND type = ?', [id, type]);
        return !!result;
    },

    async getWhitelistByType(type) {
        return await db.all('SELECT id FROM whitelist WHERE type = ?', [type]);
    },

    async setEnabled(enabled) {
        await db.run('UPDATE whitelist_config SET value = ? WHERE key = ?', [enabled.toString(), 'enabled']);
    },

    async isEnabled() {
        const result = await db.get('SELECT value FROM whitelist_config WHERE key = ?', ['enabled']);
        return result?.value === 'true';
    }
}; 