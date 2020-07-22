import { parseString } from '../lib/utils/string.js';

const {
  CONFIG_PATH,
  LOG_LEVEL,
  LOG_TELEGRAM,
  PROD_ENV,
  TELEGRAM_TOKEN,
} = process.env;

if (!CONFIG_PATH || !CONFIG_PATH.length) {
  throw new Error('no path to configuration files provided');
}

export const configPath = CONFIG_PATH;
export const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
export const logLevel = LOG_LEVEL ? parseString(LOG_LEVEL) : 0;
export const logTelegram = LOG_TELEGRAM
  ? Boolean(parseString(LOG_TELEGRAM))
  : false;
export const telegramToken = TELEGRAM_TOKEN;
