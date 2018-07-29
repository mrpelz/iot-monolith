const { Switch } = require('../switch');
const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const logPrefix = 'obi-jack';
const { log } = new Logger(logPrefix);

const obiCapabilities = [
  {
    name: 'relay',
    type: 'output',
    index: 0,
    isBoolean: true
  },
  {
    name: 'led',
    type: 'indicator',
    index: 0,
    isBoolean: true
  },
  {
    name: 'ledBlink',
    type: 'blink',
    index: 0
  },
  {
    name: 'button',
    type: 'button',
    index: 0,
    events: true
  }
];

class ObiJack extends Switch {
  constructor(options) {
    const {
      host,
      port
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      capabilities: obiCapabilities
    });

    this.relayState = false;

    rebind(this, '_handleConnection');
    this.on('connect', this._handleConnection);
  }

  _handleConnection() {
    this.set('relay', this.relayState);
  }

  relay(on) {
    return this.set('relay', on).then((value) => {
      if (value !== on) {
        throw new Error('could not set relay');
      }

      this.relayState = value;
      return value;
    }).catch((reason) => {
      log(reason);
    });
  }

  led(on) {
    return this.set('led', on).then((value) => {
      if (value !== on) {
        throw new Error('could not set led');
      }

      return value;
    }).catch((reason) => {
      log(reason);
    });
  }

  ledBlink(count) {
    return this.set('ledBlink', count).then((result) => {
      if (result !== count) {
        throw new Error('could not set ledBlink');
      }

      return result;
    }).catch((reason) => {
      log(reason);
    });
  }

  // Public methods:
  // connect
  // disconnect
  // relay
  // led
  // ledBlink
  //
  // Public properties:
  // relayState
}

module.exports = {
  ObiJack
};
