import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsPath = path.resolve(__dirname, 'settings.json');
let settings = {};

try {
  const raw = fs.readFileSync(settingsPath, 'utf8');
  settings = JSON.parse(raw);
} catch (error) {
  console.error('[Config] Error leyendo settings.json:', error.message);
}

export const Config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
  },
  tequila: {
    apiKey: process.env.TEQUILA_API_KEY || '',
  },
  rapidapi: {
    apiKey: process.env.RAPIDAPI_KEY || '',
  },
  settings,
};
