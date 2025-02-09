import { Persistence } from '../lib/persistence.js';
import { peristencePath } from './environment.js';
import { logger } from './logging.js';
import { every30Seconds } from './timings.js';

export const persistence = new Persistence(
  peristencePath,
  every30Seconds,
  logger,
);
