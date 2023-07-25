import { parse } from '../lib/string.js';

const { LOG_LEVEL, LOG_TELEGRAM, PROD_ENV, TELEGRAM_TOKEN, PERSISTENCE_PATH } =
  process.env;

export const isProd = PROD_ENV ? Boolean(parse(PROD_ENV)) : false;
export const logLevel = LOG_LEVEL ? Number(parse(LOG_LEVEL)) : 0;
export const logTelegram = LOG_TELEGRAM ? Boolean(parse(LOG_TELEGRAM)) : false;
export const telegramToken = TELEGRAM_TOKEN;
export const peristencePath =
  PERSISTENCE_PATH ?? '/var/opt/iot-monolith/persistence.json';
