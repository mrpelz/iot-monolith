import { Logger } from '../log.js';
import { Persistence } from '../persistence.js';
import { Timings } from './properties/sensors.js';

export type Context = {
  connect: boolean;
  logger: Logger;
  persistence: Persistence;
  timings: Timings;
};
