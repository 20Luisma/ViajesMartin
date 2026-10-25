import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const settingsPath = path.resolve(__dirname, 'settings.json');
const envPath = path.resolve(__dirname, '../.env');
let settings = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

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
