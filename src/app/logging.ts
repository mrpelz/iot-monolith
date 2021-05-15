import {
  DevOutput,
  JournaldOutput,
  Logger,
  // TelegramOutput,
} from '../lib/log/index.js';
import { isProd } from './environment.js';

export const logger = new Logger();

const primaryOutput = isProd ? new JournaldOutput() : new DevOutput();

// const telegramLogOutput = new TelegramOutput();

logger.addOutput(primaryOutput);
// logger.addOutput(telegramLogOutput);
