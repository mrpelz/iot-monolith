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
    this.powerSetpoint = false;
    this.power = null;

    rebind(this, '_handleSingleRelayConnection');
    this.on('reliableConnect', this._handleSingleRelayConnection);

    this.log.friendlyName(`${host}:${port}`);
    this._singleRelay.log = this.log.withPrefix(libName);
  }

  _handleSingleRelayConnection() {
    this.setPower(this.powerSetpoint);
  }

  setPower(on) {
    const { log } = this._singleRelay;

    this.powerSetpoint = Boolean(on);

    this.emit('set');

    if (this.powerSetpoint === this.power) {
      return Promise.resolve(this.power);
    }

    return this.set('relay', this.powerSetpoint).then((result) => {
      if (result !== this.powerSetpoint) {
        // reset, as conflicting message suggest a hardware fail
        // resetting to null will make following requests go through regardless of state
        this.power = null;
        throw new Error('could not set relay');
      }

      if (result !== this.power) {
        this.power = this.powerSetpoint;
        this.emit('change');
      }

      return this.power;
    }).catch((reason) => {
      log.error({
        head: 'relay error',
        attachment: reason
      });

      throw reason;
    });
  }

  toggle() {
    return this.setPower(!this.powerSetpoint);
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

      throw reason;
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

      throw reason;
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
  // powerSetpoint
}

module.exports = {
  SingleRelay
};
