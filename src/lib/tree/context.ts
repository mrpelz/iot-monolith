import { Logger } from '../log.js';
import { Persistence } from '../persistence.js';
import { Metrics } from './operations/metrics.js';
import { Timings } from './properties/sensors.js';

export type Context = {
  connect: boolean;
  logger: Logger;
  metrics: Metrics;
  persistence: Persistence;
  timings: Timings;
};
