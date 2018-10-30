const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { calc, epochs } = require('../utils/time');
const { mean } = require('../utils/math');

class History extends EventEmitter {
  static lastItems(values, n = 1) {
    return values.slice(n * -1);
  }

  static latestItems(values, t = new Date()) {
    return values.filter(({ time }) => {
      return time.getTime() > t.getTime();
    });
  }

  static trend(values, smoothing = (epochs.second * 30)) {
    const startCut = values[0].time.getTime() + smoothing;
    const endCut = values[values.length - 1].time.getTime() - smoothing;

    const startValue = mean(...values.filter(({ time }) => {
      return time.getTime() < startCut;
    }).map(({ value }) => { return value; }));

    const endValue = mean(...values.filter(({ time }) => {
      return time.getTime() > endCut;
    }).map(({ value }) => { return value; }));

    return endValue - startValue;
  }

  constructor(options = {}) {
    const {
      retainHours = 1
    } = options;

    if (!retainHours || typeof retainHours !== 'number') {
      throw new Error('insufficient options provided');
    }

    super();

    this._retain = retainHours * -1;
    this.values = [];

    rebind(this, 'add', 'get');
  }

  expunge() {
    const cut = calc('hour', this._retain);
    this.values = this.values.filter(({ time }) => {
      return time.getTime() > cut.getTime();
    }).sort((a, b) => {
      return a.time.getTime() - b.time.getTime();
    });
  }

  add(value, time = new Date()) {
    if (!value) throw new Error('no value provided');

    this.values.push({
      value,
      time
    });

    this.emit('change');
  }

  get() {
    this.expunge();
    return this.values;
  }
}

module.exports = {
  History
};
