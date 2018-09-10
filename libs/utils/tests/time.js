/* eslint-disable no-console */
const {
  Moment,
  RecurringMoment,
  Scheduler,
  TimeRange,
  RecurringTimeRange,
  calc,
  every,
  sleep
} = require('../time');

const {
  remainder
} = require('../math');

(async function test() {
  console.log(await sleep(3000, 'console.log after sleeping 3000ms'));
}());

const scheduler = new Scheduler();
scheduler.on('destroy', () => {
  console.log('destroyed scheduler');
});

const every10SecsInEvenWeek = {
  second: (sec) => {
    return !remainder(sec, 10);
  },
  week: (wn) => {
    return !(wn % 2);
  }
};

const every10SecsInOddWeek = {
  second: (sec) => {
    return !remainder(sec, 10);
  },
  week: (wn) => {
    return (wn % 2);
  }
};

const everySecond30 = {
  second: 30
};

const everySecond40 = {
  second: 40
};

const moment1 = new Moment(scheduler, calc('second', 10));
moment1.on('hit', () => {
  console.log('"nowPlus10Secs": hit');
});
moment1.on('destroy', () => {
  console.log('"nowPlus10Secs": destroyed');
});

const moment2 = new Moment(scheduler, calc('second', 10), calc('second', 15));
moment2.on('hit', () => {
  console.log('"nowPlus10Secs" or "nowPlus15Secs": hit');
});
moment2.on('destroy', () => {
  console.log('"nowPlus10Secs" or "nowPlus15Secs": destroyed');
});

const recSecond = new RecurringMoment(scheduler, every.second());
recSecond.on('hit', () => {
  console.log('"everySecond": hit');
});
recSecond.on('destroy', () => {
  console.log('"everySecond": destroyed');
});

const recMinute = new RecurringMoment(scheduler, every.minute());
recMinute.on('hit', () => {
  console.log('"everyMinute": hit');
});
recMinute.on('destroy', () => {
  console.log('"everyMinute": destroyed');
});

const rec1Moment = new RecurringMoment(scheduler, every.second(10));
rec1Moment.on('hit', () => {
  console.log('"every10Secs": hit');
});
rec1Moment.on('destroy', () => {
  console.log('"every10Secs": destroyed');
});

const rec2Moment = new RecurringMoment(scheduler, every10SecsInEvenWeek);
rec2Moment.on('hit', () => {
  console.log('"every10SecsInEvenWeek": hit');
});
rec2Moment.on('destroy', () => {
  console.log('"every10SecsInEvenWeek": destroyed');
});

const rec3Moment = new RecurringMoment(scheduler, every10SecsInOddWeek);
rec3Moment.on('hit', () => {
  console.log('"every10SecsInOddWeek": hit');
});
rec3Moment.on('destroy', () => {
  console.log('"every10SecsInOddWeek": destroyed');
});

const range1 = new TimeRange(scheduler, {
  from: calc('second', -10),
  to: calc('second', 10)
});
range1.on('start', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs": started');
});
range1.on('end', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs": ended');
});
range1.on('destroy', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs": destroyed');
});

const range2 = new TimeRange(scheduler, {
  from: calc('second', 15),
  to: calc('second', 20)
});
range2.on('start', () => {
  console.log('"nowPlus15Secs" to "nowPlus20Secs": started');
});
range2.on('end', () => {
  console.log('"nowPlus15Secs" to "nowPlus20Secs": ended');
});
range2.on('destroy', () => {
  console.log('"nowPlus15Secs" to "nowPlus20Secs": destroyed');
});

const range3 = new TimeRange(scheduler, {
  from: calc('second', -10),
  to: calc('second', 10)
}, {
  from: calc('second', 15),
  to: calc('second', 20)
});
range3.on('start', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs" or "nowPlus15Secs" to "nowPlus20Secs": started');
});
range3.on('end', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs" or "nowPlus15Secs" to "nowPlus20Secs": ended');
});
range3.on('destroy', () => {
  console.log('"nowMinus10Secs" to "nowPlus10Secs" or "nowPlus15Secs" to "nowPlus20Secs": destroyed');
});

const rec1Range = new RecurringTimeRange(scheduler, {
  from: everySecond30,
  to: everySecond40
});
rec1Range.on('start', () => {
  console.log('"everySecond30" to "everySecond40": started');
});
rec1Range.on('end', () => {
  console.log('"everySecond30" to "everySecond40": ended');
});
rec1Range.on('destroy', () => {
  console.log('"everySecond30" to "everySecond40": destroyed');
});
