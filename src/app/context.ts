import { Context } from '../lib/tree/context.js';
import { logger } from './logging.js';
import { persistence } from './persistence.js';
import { timings } from './timings.js';

export const context: Context = {
  logger,
  persistence,
  timings,
};
