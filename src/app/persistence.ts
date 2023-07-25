import { Persistence } from '../lib/persistence.js';
import { peristencePath } from './environment.js';
import { logger } from './logging.js';

export const persistence = new Persistence(peristencePath, logger);
