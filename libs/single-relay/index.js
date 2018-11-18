const { Switch } = require('../switch');
const { rebind } = require('../utils/oop');

const libName = 'single-relay';

const singleRelayCapabilities = [
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

class SingleRelay extends Switch {
  constructor(options = {}) {
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
      capabilities: singleRelayCapabilities
    });

    this._singleRelay = {};
    this.relayState = false;

    rebind(this, '_handleSingleRelayConnection');
    this.on('connect', this._handleSingleRelayConnection);

    this.log.friendlyName(`${host}:${port}`);
    this._singleRelay.log = this.log.withPrefix(libName);
  }

  _handleSingleRelayConnection() {
    this.relay(this.relayState);
  }

  relay(on) {
    const { log } = this._singleRelay;

    return this.set('relay', on).then((value) => {
      if (value !== on) {
        throw new Error('could not set relay');
      }

      if (value !== this.relayState) {
        this.relayState = value;
        this.emit('change');
      }
      return value;
    }).catch((reason) => {
      log.error({
        head: 'relay error',
        attachment: reason
      });
    });
  }

  relayToggle() {
    return this.relay(!this.relayState);
  }

  led(on) {
    const { log } = this._singleRelay;

    return this.set('led', on).then((value) => {
      if (value !== on) {
        throw new Error('could not set led');
      }

      return value;
    }).catch((reason) => {
      log.error({
        head: 'led error',
        attachment: reason
      });
    });
  }

  ledBlink(count) {
    const { log } = this._singleRelay;

    return this.set('ledBlink', count).then((result) => {
      if (result !== count) {
        throw new Error('could not set ledBlink');
      }

      return result;
    }).catch((reason) => {
      log.error({
        head: 'led-blink error',
        attachment: reason
      });
    });
  }

  // Public methods:
  // connect
  // disconnect
  // relay
  // relayToggle
  // led
  // ledBlink
  //
  // Public properties:
  // relayState
}

module.exports = {
  SingleRelay
};
