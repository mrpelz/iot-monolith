import {
  DevOutput,
  JournaldOutput,
  Level,
  Logger,
  // TelegramOutput,
} from '../lib/log.js';
import { isProd, logLevel } from './environment.js';

export const logger = new Logger();

const primaryOutput = isProd
  ? new JournaldOutput(logLevel ?? Level.INFO)
  : new DevOutput(logLevel ?? Level.DEBUG);

// const telegramLogOutput = new TelegramOutput(logLevel);

logger.addOutput(primaryOutput);
// logger.addOutput(telegramLogOutput);
