const EventEmitter = require('events');

class Base extends EventEmitter {
  constructor() {
    super();
    this._base = {
      access: null
    };
  }

  access(...path) {
    const { access } = this._base;

    if (!path.length) {
      throw new Error('insufficient options provided');
    }

    if (!access) {
      throw new Error('access paths are not configured');
    }

    const fnName = path.reduce((prev, curr) => {
      return prev && (prev[curr] || null);
    }, access);

    return fnName && (this[fnName] || null);
  }
}

module.exports = {
  Base
};
