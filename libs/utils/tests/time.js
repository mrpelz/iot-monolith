/* eslint-disable no-console */
const {
  Moment,
  RecurringMoment,
  Scheduler,
  TimeRange,
  RecurringTimeRange,
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

const nowMinus10Secs = new Date(Date.now() - 10000);
const nowPlus10Secs = new Date(Date.now() + 10000);
const nowPlus15Secs = new Date(Date.now() + 15000);
const nowPlus20Secs = new Date(Date.now() + 20000);

const every10Secs = {
  second: (input) => {
    return !remainder(input, 10);
  }
};

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

const moment1 = new Moment(scheduler, nowPlus10Secs);
moment1.on('hit', () => {
  console.log('"nowPlus10Secs": hit');
});
moment1.on('destroy', () => {
  console.log('"nowPlus10Secs": destroyed');
});

const moment2 = new Moment(scheduler, nowPlus10Secs, nowPlus15Secs);
moment2.on('hit', () => {
  console.log('"nowPlus10Secs" or "nowPlus15Secs": hit');
});
moment2.on('destroy', () => {
  console.log('"nowPlus10Secs" or "nowPlus15Secs": destroyed');
});

const rec1Moment = new RecurringMoment(scheduler, every10Secs);
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
  from: nowMinus10Secs,
  to: nowPlus10Secs
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
  from: nowPlus15Secs,
  to: nowPlus20Secs
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
  from: nowMinus10Secs,
  to: nowPlus10Secs
}, {
  from: nowPlus15Secs,
  to: nowPlus20Secs
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
