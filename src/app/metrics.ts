import { Metrics } from '../lib/tree/operations/metrics.js';
import { logger } from './logging.js';

export const metrics = new Metrics(logger);
