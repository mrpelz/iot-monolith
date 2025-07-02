import {
  CustomLevel,
  DevOutput,
  JournaldOutput,
  Level,
  Logger,
  VirtualOutput,
  // TelegramOutput,
} from '../lib/log.js';
import { isProd, logLevel } from './environment.js';

export const logger = new Logger();

const primaryOutput = isProd
  ? new JournaldOutput(logLevel ?? Level.INFO)
  : new DevOutput(logLevel ?? Level.DEBUG);

export const logicReasoningLevel = new CustomLevel(Level.INFO);
export const logicReasoningOutput = new VirtualOutput(logicReasoningLevel);

// const telegramLogOutput = new TelegramOutput(logLevel);

logger.addOutput(primaryOutput);
logger.addOutput(logicReasoningOutput);
// logger.addOutput(telegramLogOutput);
