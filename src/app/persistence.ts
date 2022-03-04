import { Persistence } from '../lib/persistence.js';
import { logger } from './logging.js';
import { peristencePath } from './environment.js';

export const persistence = new Persistence(peristencePath, logger);
