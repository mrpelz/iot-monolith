import { Context } from '../lib/tree/context.js';
import { connect } from './environment.js';
import { logger } from './logging.js';
// import { metrics } from './metrics.js';
import { persistence } from './persistence.js';
import { timings } from './timings.js';

export const context: Context = {
  connect,
  logger,
  // metrics,
  persistence,
  timings,
};
