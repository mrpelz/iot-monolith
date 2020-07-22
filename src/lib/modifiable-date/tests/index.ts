import { ModifiableDate, Unit } from '../index.js';

const test = new ModifiableDate();
// eslint-disable-next-line no-console
console.log('init: now;', test.date.toLocaleString('de'));

test.add(5, Unit.YEAR);
// eslint-disable-next-line no-console
console.log('add: 5 years;', test.date.toLocaleString('de'));

test.subtract(2, Unit.MONTH);
// eslint-disable-next-line no-console
console.log('subtract: 2 months;', test.date.toLocaleString('de'));

test.add(48, Unit.HOUR);
// eslint-disable-next-line no-console
console.log('add: 48 hours;', test.date.toLocaleString('de'));

test.ceil(Unit.SECOND, 10);
// eslint-disable-next-line no-console
console.log('ceil: second → 10;', test.date.toLocaleString('de'));

test.floor(Unit.MINUTE, 5);
// eslint-disable-next-line no-console
console.log('floor: minute → 5;', test.date.toLocaleString('de'));

test.truncateToNext(Unit.MINUTE);
// eslint-disable-next-line no-console
console.log('truncateToNext: minute;', test.date.toLocaleString('de'));

test.truncateToPrevious(Unit.MINUTE);
// eslint-disable-next-line no-console
console.log('truncateToPrevious: minute;', test.date.toLocaleString('de'));

test.round(Unit.MINUTE, 15);
// eslint-disable-next-line no-console
console.log('round: minute → 15;', test.date.toLocaleString('de'));

test.truncateTo(Unit.WEEK);
// eslint-disable-next-line no-console
console.log('truncateTo: week;', test.date.toLocaleString('de'));
