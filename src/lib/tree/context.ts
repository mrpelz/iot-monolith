import { Logger } from '../log.js';
import { Metrics } from '../metrics.js';
import { Persistence } from '../persistence.js';
import { Timings } from './properties/sensors.js';

export type Context = {
  connect: boolean;
  connectExcept: string[];
  logger: Logger;
  metrics: Metrics;
  persistence: Persistence;
  timings: Timings;
};
