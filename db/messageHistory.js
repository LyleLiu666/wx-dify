import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { DB_CONFIG } from '../config/dbConfig.js';

let db;

async function initDB() {
    db = await open({
        filename: DB_CONFIG.messageHistoryDB,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT,
            sender TEXT,
            message_type TEXT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function saveMessage(conversationId, sender, messageType, content) {
    await db.run(
        'INSERT INTO messages (conversation_id, sender, message_type, content) VALUES (?, ?, ?, ?)',
        [conversationId, sender, messageType, content]
    );
}

async function getRecentContext(conversationId, limit = 10) {
    const messages = await db.all(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY id desc LIMIT ?',
        [conversationId, limit]
    );

    return messages.reverse();
}

export {
    initDB,
    saveMessage,
    getRecentContext
}; 