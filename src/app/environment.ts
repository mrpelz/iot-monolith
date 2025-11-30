import { createRequire } from 'node:module';

import { ensureKeys } from '@mrpelz/misc-utils/oop';
import { parse } from '@mrpelz/misc-utils/string';

const nodeRequire = createRequire(import.meta.url);
const packageJson = nodeRequire('../../package.json');

export const { version } = ensureKeys(
  packageJson as Record<string, string>,
  'version',
);

const {
  CONNECT,
  LOG_LEVEL,
  LOG_TELEGRAM,
  NODE_ENV,
  PERSISTENCE_PATH,
  TELEGRAM_TOKEN,
} = process.env;

if (!PERSISTENCE_PATH) {
  // eslint-disable-next-line no-console
  console.error('required environment info not supplied, exiting.');
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
}

export const connect = CONNECT ? Boolean(parse(CONNECT)) : false;
export const isProd = NODE_ENV === 'production';
export const logLevel = LOG_LEVEL ? Number(parse(LOG_LEVEL)) : undefined;
export const logTelegram = LOG_TELEGRAM ? Boolean(parse(LOG_TELEGRAM)) : false;
export const telegramToken = TELEGRAM_TOKEN;
export const peristencePath = PERSISTENCE_PATH;
