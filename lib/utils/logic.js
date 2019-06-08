const EventEmitter = require('events');

class Latch extends EventEmitter {
  constructor(options = {}) {
    const {
      states: stateCount = 2,
      initial = 0
    } = options;

    const states = stateCount - 1;

    if (states < 1 || initial > states) {
      throw new Error('insufficient options provided');
    }

    super();

    this.state = initial;
    this.states = states;
  }

  _publish() {
    const output = this.states === 1
      ? Boolean(this.state)
      : this.state;

    this.emit('hit', output);

    return output;
  }

  hit() {
    const newState = this.state + 1;

    this.state = newState > this.states
      ? 0
      : newState;

    return this._publish();
  }

  set(input) {
    if (input > this.states) {
      throw new Error('illegal state');
    }

    this.state = input;

    return this._publish();
  }
}

class Hysteresis extends EventEmitter {
  constructor(options = {}) {
    const {
      inRangeAbove = 0,
      outOfRangeBelow = 0
    } = options;

    if (inRangeAbove === outOfRangeBelow) {
      throw new Error('insufficient options provided');
    }

    super();

    this.inRangeAbove = inRangeAbove;
    this.outOfRangeBelow = outOfRangeBelow;
    this.inRange = false;
  }

  feed(input) {
    if (typeof input !== 'number') return null;

    const inRange = input > this.inRangeAbove
    || (
      this.inRange
      && input > this.outOfRangeBelow
    );

    if (inRange === this.inRange) return this.inRange;

    this.inRange = inRange;

    this.emit(this.inRange ? 'inRange' : 'outOfRange');
    this.emit('hit', this.inRange);

    return this.inRange;
  }
}

class Remap {
  constructor(ranges = []) {
    this._ranges = ranges;
  }

  convert(inKey, outKey, input) {
    const matchingRange = this._ranges.find((range) => {
      if (!range[inKey] || !range[outKey]) return false;

      const {
        [inKey]: [from, to] = []
      } = range;
      return from !== undefined
        && to !== undefined
        && input >= from
        && input <= to;
    });

    if (!matchingRange) return null;

    const {
      [inKey]: [inFrom, inTo] = [],
      [outKey]: [outFrom, outTo, round = true] = []
    } = matchingRange;

    const ratio = (input - inFrom) / (Math.abs(inTo - inFrom));
    const intermediate = (ratio * Math.abs(outTo - outFrom)) + outFrom;
    const output = round ? Math.round(intermediate) : intermediate;

    return output;
  }

  aToB(input) {
    return this.convert('a', 'b', input);
  }

  bToA(input) {
    return this.convert('b', 'a', input);
  }
}

module.exports = {
  Latch,
  Hysteresis,
  Remap
};
