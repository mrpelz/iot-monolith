import { epochs, ModifiableDate, Unit } from '@mrpelz/modifiable-date';

import { Schedule } from '../lib/schedule.js';
import { Timings } from '../lib/tree/properties/sensors.js';
import { logger } from './logging.js';

export const every5Seconds = new Schedule(
  logger,
  () => new ModifiableDate().ceil(Unit.SECOND, 5).date,
  false,
);

export const every30Seconds = new Schedule(
  logger,
  () => new ModifiableDate().ceil(Unit.SECOND, 30).date,
  false,
);

export const every2Minutes = new Schedule(
  logger,
  () => new ModifiableDate().ceil(Unit.MINUTE, 2).date,
  false,
);

export const epoch5Seconds = epochs.second * 5;
export const epoch30Seconds = epochs.second * 30;
export const epoch2Minutes = epochs.minute * 2;

export const timings: Timings = {
  default: [every5Seconds, epoch5Seconds],
  moderate: [every30Seconds, epoch30Seconds],
  slow: [every2Minutes, epoch2Minutes],
};

every5Seconds.start();
every30Seconds.start();
every2Minutes.start();
