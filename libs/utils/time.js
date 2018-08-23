const EventEmitter = require('events');
const { rebind } = require('./oop');
const { isObject } = require('./structures');

function getWeekNumber(input) {
  const date = new Date(input.getTime());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function recurring(options) {
  if (!isObject(options)) {
    throw new Error('insufficient options provided');
  }

  const matchers = Object.keys(options).map((key) => {
    const { [key]: match } = options;
    const simple = typeof match === 'number';

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

      return simple
        ? match === now
        : match(now);
    };
  });

  return (date) => {
    return matchers.every((match) => {
      return match(date);
    });
  };
}

function recurringToDate(input) {
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

function sleep(time, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, time);
  });
}

class TimeFloor {
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
    result.setDate(result.getDate() - result.getDay() + 1);
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

class Moment extends EventEmitter {
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

class RecurringMoment extends EventEmitter {
  static prepare(input) {
    return input.map(recurring);
  }

  constructor(scheduler, ...moments) {
    if (!scheduler || !moments.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._moments = RecurringMoment.prepare(moments);

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

class Scheduler extends EventEmitter {
  constructor(precision = 125) {
    super();

    this._interval = setInterval(() => {
      this.emit('tick');
    }, precision);
  }

  destroy() {
    this.emit('destroy');
    clearInterval(this._interval);
  }
}

class TimeRange extends EventEmitter {
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

class RecurringTimeRange extends EventEmitter {
  static prepare(input) {
    return input.map((range) => {
      return {
        from: recurring(range.from),
        to: recurring(range.to)
      };
    });
  }

  constructor(scheduler, ...ranges) {
    if (!scheduler || !ranges.length) {
      throw new Error('insufficient options provided');
    }

    super();

    this._scheduler = scheduler;
    this._ranges = RecurringTimeRange.prepare(ranges);
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

module.exports = {
  Moment,
  RecurringMoment,
  Scheduler,
  TimeRange,
  RecurringTimeRange,
  TimeFloor,
  getWeekNumber,
  recurring,
  recurringToDate,
  sleep
};
