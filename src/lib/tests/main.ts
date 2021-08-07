import { DevOutput, Level, Logger } from '../log.js';

export const logger = new Logger();

logger.addOutput(new DevOutput(Level.INFO));
