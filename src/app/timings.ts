import { ModifiableDate, Unit } from '../lib/modifiable-date/index.js';
import { Schedule } from '../lib/schedule/index.js';

export const every5Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 5).date,
  false
);

export const every30Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 30).date,
  false
);

export const every2Minutes = new Schedule(
  () => new ModifiableDate().ceil(Unit.MINUTE, 2).date,
  false
);

every5Seconds.start();
every30Seconds.start();
every2Minutes.start();
