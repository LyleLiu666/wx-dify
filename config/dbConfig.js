import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

export const DB_CONFIG = {
    dataDir: DATA_DIR,
    messageHistoryDB: path.join(DATA_DIR, 'message_history.db'),
    whitelistDB: path.join(DATA_DIR, 'whitelist.db')
};

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
} 