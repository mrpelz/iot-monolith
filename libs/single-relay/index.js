const { Switch } = require('../switch');
const { resolveAlways, rebind } = require('../utils/oop');

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
    this.power = false;

    rebind(this, '_handleSingleRelayConnection');
    this.on('connect', this._handleSingleRelayConnection);

    this.log.friendlyName(`${host}:${port}`);
    this._singleRelay.log = this.log.withPrefix(libName);
  }

  _handleSingleRelayConnection() {
    this.setPower(this.power);
  }

  setPower(on) {
    const { log } = this._singleRelay;

    return this.set('relay', on).then((value) => {
      if (value !== on) {
        throw new Error('could not set relay');
      }

      if (value !== this.power) {
        this.power = value;
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

  toggle() {
    return this.setPower(!this.power);
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

  ledBlink(count, quiet = false) {
    const { log } = this._singleRelay;

    const blink = this.set('ledBlink', count).then((result) => {
      if (result !== count) {
        throw new Error('could not set ledBlink');
      }

      return result;
    });

    if (quiet) {
      resolveAlways(blink);
    } else {
      blink.catch((reason) => {
        log.error({
          head: 'led-blink error',
          attachment: reason
        });
      });
    }

    return blink;
  }

  // Public methods:
  // connect
  // disconnect
  // setPower
  // toggle
  // led
  // ledBlink
  //
  // Public properties:
  // power
}

module.exports = {
  SingleRelay
};
