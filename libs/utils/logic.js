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

module.exports = {
  Latch
};
