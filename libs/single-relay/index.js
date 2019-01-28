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
    this._powerSetpoint = false;
    this.power = null;

    rebind(this, '_handleSingleRelayConnection');
    this.on('connect', this._handleSingleRelayConnection);

    this.log.friendlyName(`${host}:${port}`);
    this._singleRelay.log = this.log.withPrefix(libName);
  }

  _handleSingleRelayConnection() {
    this.setPower(this._powerSetpoint);
  }

  setPower(on) {
    const { log } = this._singleRelay;

    this._powerSetpoint = Boolean(on);

    this.emit('set');

    if (this._powerSetpoint === this.power) {
      return Promise.resolve(this.power);
    }

    return this.set('relay', this._powerSetpoint).then((result) => {
      if (result !== this._powerSetpoint) {
        throw new Error('could not set relay');
      }

      if (result !== this.power) {
        this.power = this._powerSetpoint;
        this.emit('change');
      }

      return this.power;
    }).catch((reason) => {
      log.error({
        head: 'relay error',
        attachment: reason
      });
    });
  }

  toggle() {
    return this.setPower(!this._powerSetpoint);
  }

  led(on) {
    const { log } = this._singleRelay;

    return this.set('led', on).then((result) => {
      if (result !== on) {
        throw new Error('could not set led');
      }

      return result;
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
      return resolveAlways(blink);
    }

    return blink.catch((reason) => {
      log.error({
        head: 'led-blink error',
        attachment: reason
      });
    });
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
