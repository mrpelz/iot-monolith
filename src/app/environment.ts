import { createRequire } from 'node:module';

import { prerelease as semverPrerelease } from 'semver';

import { ensureKeys } from '../lib/oop.js';
import { parse } from '../lib/string.js';

const nodeRequire = createRequire(import.meta.url);
const packageJson = nodeRequire('../../package.json');

export const { version } = ensureKeys(
  packageJson as Record<string, string>,
  'version',
);

export const prereleaseTag = version
  ? (semverPrerelease(version)?.at(0) ?? undefined)
  : undefined;

const {
  CONNECT,
  HAP_STORAGE_PATH,
  LOG_LEVEL,
  LOG_TELEGRAM,
  NODE_ENV,
  PERSISTENCE_PATH,
  TELEGRAM_TOKEN,
} = process.env;

export const connect = CONNECT ? Boolean(parse(CONNECT)) : false;
export const hapStoragePath =
  HAP_STORAGE_PATH ?? '/var/opt/iot-monolith/hap-storage';
export const isProd = NODE_ENV === 'production';
export const logLevel = LOG_LEVEL ? Number(parse(LOG_LEVEL)) : 0;
export const logTelegram = LOG_TELEGRAM ? Boolean(parse(LOG_TELEGRAM)) : false;
export const telegramToken = TELEGRAM_TOKEN;
export const peristencePath =
  PERSISTENCE_PATH ?? '/var/opt/iot-monolith/persistence.json';
