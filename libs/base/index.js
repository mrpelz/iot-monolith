const EventEmitter = require('events');
const { Logger } = require('../log');

class Base extends EventEmitter {
  constructor() {
    super();
    this.log = new Logger();
  }
}

module.exports = {
  Base
};
