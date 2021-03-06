import { EventEmitter } from 'events';
import { isObject } from './structures.js';
import { rebind } from './oop.js';
import { remainder } from './math.js';

export function sortTimes(...input) {
  return input.sort((a, b) => {
    return a.getTime() - b.getTime();
  });
}

// https://jsfiddle.net/jonathansampson/m7G64/
export function throttle(limit = 500) {
  let run = true;
  return () => {
    if (run) {
      run = false;
      setTimeout(() => {
        run = true;
      }, limit);

      return true;
    }

    return false;
  };
}

export function daysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

export function isLeapYear(year) {
  /* eslint-disable-next-line no-bitwise */
  return !((year & 3 || !(year % 25)) && year & 15);
}

function everyTime(type, count = 1) {
  if (count === 1) {
    return {
      [type]: 'change'
    };
  }

  return {
    [type]: (input) => {
      return !remainder(input, count);
    }
  };
}

export const every = {
  second: (input) => {
    return everyTime('second', input);
  },
  minute: (input) => {
    return everyTime('minute', input);
  },
  hour: (input) => {
    return everyTime('hour', input);
  },
  date: (input) => {
    return everyTime('date', input);
  },
  day: (input) => {
    return everyTime('day', input);
  },
  week: (input) => {
    return everyTime('week', input);
  },
  month: (input) => {
    return everyTime('month', input);
  },
  year: (input) => {
    return everyTime('year', input);
  },
  parse: (input) => {
    if (typeof input !== 'string') throw new Error(`"${input}" is not a string`);

    const [keyword, num, option] = input.split(':');
    const count = Number.parseInt(num, 10);

    if (keyword !== 'every') throw new Error(`"${input}" does not start with "every" keyword`);
    if (Number.isNaN(count) || count <= 0) throw new Error('illegal number given');

    switch (option) {
      case 'second':
        return everyTime('second', count);
      case 'minute':
        return everyTime('minute', count);
      case 'hour':
        return everyTime('hour', count);
      case 'date':
        return everyTime('date', count);
      case 'day':
        return everyTime('day', count);
      case 'week':
        return everyTime('week', count);
      case 'month':
        return everyTime('month', count);
      case 'year':
        return everyTime('year', count);
      default:
        throw new Error('illegal option given');
    }
  }
};

export const epochs = (() => {
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const date = 24 * hour;
  const week = 7 * date;
  const accountingMonth = 30 * date;
  const year = 365 * date;
  const leapYear = 366 * date;


  return {
    second,
    minute,
    hour,
    date,
    day: date,
    week,
    accountingMonth,
    get thisMonth() {
      const d = new Date();
      return daysInMonth(d.getMonth(), d.getFullYear()) * date;
    },
    specificMonth: (m, y) => {
      return daysInMonth(m, y) * date;
    },
    year,
    leapYear,
    get thisYear() {
      const leap = isLeapYear(new Date().getFullYear());
      return leap ? leapYear : year;
    },
    specificYear: (y) => {
      const leap = isLeapYear(y);
      return leap ? leapYear : year;
    }
  };
})();

export function calc(type, count = 1, ref) {
  const date = ref
    ? new Date(ref.getTime())
    : new Date();

  switch (type) {
    case 'second':
      date.setSeconds(date.getSeconds() + count);
      break;
    case 'minute':
      date.setMinutes(date.getMinutes() + count);
      break;
    case 'hour':
      date.setHours(date.getHours() + count);
      break;
    case 'date':
      date.setDate(date.getDate() + count);
      break;
    case 'week':
      date.setDate(date.getDate() + (count * 7));
      break;
    case 'month':
      date.setMonth(date.getMonth() + count);
      break;
    case 'year':
      date.setFullYear(date.getFullYear() + count);
      break;
    default:
  }

  return date;
}

export function getWeekNumber(input) {
  const date = new Date(input.getTime());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function recurring(options, offset) {
  if (!isObject(options)) {
    throw new Error('insufficient options provided');
  }

  const matchers = Object.keys(options).map((key) => {
    const { [key]: match } = options;
    const simple = typeof match === 'number';

    let lastMatch = 0;

    return (date) => {
      let now = null;

      switch (key) {
        case 'second':
          now = date.getSeconds();
          break;
        case 'minute':
          now = date.getMinutes();
          break;
        case 'hour':
          now = date.getHours();
          break;
        case 'date':
          now = date.getDate();
          break;
        case 'day':
          now = date.getDay();
          break;
        case 'week':
          now = getWeekNumber(date);
          break;
        case 'month':
          now = date.getMonth();
          break;
        case 'year':
          now = date.getFullYear();
          break;
        default:
          break;
      }

      if (match === 'change') {
        const change = lastMatch !== now;
        lastMatch = now;

        return change;
      }

      return simple
        ? match === now
        : match(now);
    };
  });

  return (date) => {
    const now = new Date(date.getTime() - (offset || 0));

    return matchers.every((match) => {
      return match(now);
    });
  };
}

export function recurringToDate(input) {
  const date = new Date();
  date.setHours(
    input.hour || 0,
    input.minute || 0,
    input.second || 0,
    0
  );
  date.setDate(input.date || 1);
  date.setMonth(input.month || 0);
  date.setFullYear(input.year || 0);

  return date;
}

export function sleep(time, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, time);
  });
}

export class CallTiming {
  hit() {
    this._callTime = Date.now();
  }

  check(duration = 10000) {
    return (this._callTime || 0) > Date.now() - duration;
  }
}

export class TimeFloor {
  static second(input) {
    const result = new Date(input.getTime());
    result.setMilliseconds(0);
    return result;
  }

  static minute(input) {
    const result = new Date(input.getTime());
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
  }

  static hour(input) {
    const result = new Date(input.getTime());
    result.setMinutes(0);
    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
  }

  static day(input) {
    const result = new Date(input.getTime());
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static week(input) {
    const result = new Date(input.getTime());
    result.setHours(0, 0, 0, 0);
    const day = result.getDay();
    result.setDate(result.getDate() - (day < 1 ? 6 : day - 1));
    return result;
  }

  static month(input) {
    const result = new Date(input.getTime());
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  static year(input) {
    const result = new Date(input.getTime());
    result.setMonth(0);
    result.setDate(1);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}

export class Moment extends EventEmitter {
  static prepare(input) {
    const now = TimeFloor.second(new Date()).getTime();

    return [...new Set(input.map((moment) => {
      const time = TimeFloor.second(moment).getTime();
      return time > now && time;
    }).filter((moment) => {
      return moment !== false;
    }))].sort((a, b) => {
      return a - b;
    });
  }

  constructor(scheduler, ...moments) {
    if (!scheduler || !moments.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._moments = Moment.prepare(moments);

    this.is = undefined;

    rebind(this, '_hit');
    this._scheduler.on('tick', this._hit);
  }

  _hit() {
    const now = TimeFloor.second(new Date()).getTime();
    const is = this._moments[0] === now;

    if (is !== this.is && this.is !== undefined && is) {
      this.emit('hit');
      this._moments.shift();
    }

    this.is = is;

    if (!this._moments.length) {
      this.destroy();
    }
  }

  destroy() {
    this.emit('destroy');
    this._scheduler.removeListener('tick', this._hit);
  }
}

export class RecurringMoment extends EventEmitter {
  static prepare(input, offset) {
    return input.map((moment) => {
      return recurring(moment, offset);
    });
  }

  constructor(options = {}, ...moments) {
    const {
      scheduler,
      offset
    } = options;

    if (!scheduler || !moments.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._moments = RecurringMoment.prepare(moments, offset);

    this.is = undefined;

    rebind(this, '_hit');
    this._scheduler.on('tick', this._hit);
  }

  _hit() {
    const now = TimeFloor.second(new Date());

    const is = this._moments.some((moment) => {
      return moment(now);
    });

    if (is !== this.is && this.is !== undefined && is) {
      this.emit('hit');
    }

    this.is = is;
  }

  destroy() {
    this.emit('destroy');
    this._scheduler.removeListener('tick', this._hit);
  }
}

export class Scheduler extends EventEmitter {
  constructor(precision = 125) {
    super();

    this.setMaxListeners(0);

    this._interval = setInterval(() => {
      this.emit('tick');
    }, precision);
  }

  destroy() {
    this.emit('destroy');
    clearInterval(this._interval);
  }
}

export class Timer extends EventEmitter {
  constructor(time = 0) {
    super();

    this._time = time;
    this._timeout = null;
    this._enabled = true;

    rebind(this, '_handleFire');
  }

  _handleFire() {
    this.stop(true);
    this.emit('change');
    this.emit('hit');
  }

  stop(suppressEvent = false) {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;

      if (suppressEvent) return;
      this.emit('change');
      this.emit('aborted');
    }
  }

  start(suppressEvent = false, restart = true) {
    if (!this._enabled) return;
    if (this.isRunning && !restart) return;

    this.stop(true);
    this._timeout = setTimeout(this._handleFire, this._time);

    if (suppressEvent) return;
    this.emit('change');
    this.emit('start');
  }

  enable() {
    if (this._enabled) return;

    this._enabled = true;
    this.emit('change');
  }

  disable() {
    if (!this._enabled) return;

    this.stop(true);
    this._enabled = false;
    this.emit('change');
  }

  get isRunning() {
    return Boolean(this._timeout);
  }

  get isEnabled() {
    return Boolean(this._enabled);
  }
}

export class TimeRange extends EventEmitter {
  static prepare(input) {
    const now = TimeFloor.second(new Date()).getTime();
    let lastTo = 0;

    return input.map((range) => {
      const from = TimeFloor.second(range.from).getTime();
      const to = TimeFloor.second(range.to).getTime();

      if (from > to || to < now || from < lastTo) {
        throw new Error('illegal time range');
      }

      lastTo = to;

      if (now > from) {
        return {
          from: true,
          to
        };
      }

      return {
        from,
        to
      };
    }).sort((a, b) => {
      return a.to - b.to;
    });
  }

  constructor(scheduler, ...ranges) {
    if (!scheduler || !ranges.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._ranges = TimeRange.prepare(ranges);

    this.inRange = undefined;

    rebind(this, '_hit');
    this._scheduler.on('tick', this._hit);
  }

  _hit() {
    const now = TimeFloor.second(new Date()).getTime();

    const { from, to } = this._ranges[0];
    const hasBegun = from === true;
    if (hasBegun && this.inRange === undefined) {
      this.inRange = null;
    }

    const inRange = (hasBegun || now > from) && now < to;

    if (inRange !== this.inRange && this.inRange !== undefined) {
      this.emit(inRange ? 'start' : 'end');
      if (!inRange) {
        this._ranges.shift();
      }
    }

    this.inRange = inRange;

    if (!this._ranges.length) {
      this.destroy();
    }
  }

  destroy() {
    this.emit('destroy');
    this._scheduler.removeListener('tick', this._hit);
  }
}

export class RecurringTimeRange extends EventEmitter {
  static prepare(input, offset) {
    return input.map((range) => {
      return {
        from: recurring(range.from, offset),
        to: recurring(range.to, offset)
      };
    });
  }

  constructor(options = {}, ...ranges) {
    const {
      scheduler,
      offset
    } = options;

    if (!scheduler || !ranges.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._ranges = RecurringTimeRange.prepare(ranges, offset);
    this._activeRangeEnd = undefined;

    this.inRange = undefined;

    rebind(this, '_hit');
    this._scheduler.on('tick', this._hit);
  }

  _hit() {
    const now = TimeFloor.second(new Date());

    if (this._activeRangeEnd) {
      const ended = this._activeRangeEnd(now);

      if (ended) {
        this.emit('end');
        this._activeRangeEnd = undefined;
      }
    } else {
      const startedRange = this._ranges.find((range) => {
        const { from } = range;
        return from(now);
      });

      if (startedRange) {
        this.emit('start');
        this._activeRangeEnd = startedRange.to;
      }
    }
  }

  destroy() {
    this.emit('destroy');
    this._scheduler.removeListener('tick', this._hit);
  }
}
