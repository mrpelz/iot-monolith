import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { Schedule } from '../index.js';

const test = new Schedule(
  () => new ModifiableDate().truncateToNext(Unit.SECOND).date
);

test.addTask(() => {
  const now = new Date();
  // eslint-disable-next-line no-console
  console.log('now', now.toLocaleString('de'), now.getMilliseconds());
});

const test2 = new Schedule(
  () => new ModifiableDate().truncateToNext(Unit.MINUTE).date
);

test2.addTask(() => {
  // eslint-disable-next-line no-console
  console.log('nextMinute');
});

const test3 = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 15).date
);

test3.addTask(() => {
  // eslint-disable-next-line no-console
  console.log('next 15 seconds');
});

const test4 = new Schedule(
  () => new ModifiableDate().ceil(Unit.MINUTE, 2).date
);

test4.addTask(() => {
  // eslint-disable-next-line no-console
  console.log('next 2 minutes');
});
