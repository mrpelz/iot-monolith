const { Base } = require('../base');
const { MessageClient } = require('../messaging');
const {
  booleanToBuffer,
  bufferToBoolean,
  readNumber,
  writeNumber
} = require('../utils/data');
const { rebind, resolveAlways } = require('../utils/oop');
const { camel } = require('../utils/string');

const libName = 'relay';

const buttonMappings = {
  0: 'down',
  1: 'up',
  2: 'shortpress',
  3: 'longpress'
};

function getMessageTypes(channels, buttons) {
  return [
    ...new Array(channels).fill(undefined).map((_, index) => {
      return {
        generator: booleanToBuffer,
        head: Buffer.from([1, index]),
        name: index,
        parser: bufferToBoolean
      };
    }),
    ...[].concat(...new Array(buttons).fill(undefined).map((_, index) => {
      return Object.keys(buttonMappings).map((payload) => {
        const { [payload]: action } = buttonMappings;
        const name = camel('button', index.toString(), action);

        return {
          eventName: name,
          head: Buffer.from([2, index, payload]),
          name
        };
      });
    })),
    {
      generator: booleanToBuffer,
      head: Buffer.from([0, 0]),
      name: 'indicator',
      parser: bufferToBoolean
    },
    {
      generator: writeNumber,
      head: Buffer.from([3, 0]),
      name: 'indicatorBlink',
      parser: readNumber
    }
  ];
}

class RelayDriver extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      channels = 0,
      buttons = 0,
      hasIndicator = true
    } = options;

    if (!host || !port || !channels) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: getMessageTypes(channels, buttons)
    });

    this._relayDriver = {
      channels: new Array(channels).fill(false),
      hasIndicator
    };

    this.log.friendlyName(`Driver ${host}:${port}`);
    this._relayDriver.log = this.log.withPrefix(libName);
  }

  _set(channel, payload) {
    const {
      state: {
        isConnected
      }
    } = this._reliableSocket;

    const { channels, log } = this._relayDriver;

    if (!isConnected) {
      return Promise.reject(new Error('driver not connected'));
    }

    if (channels[channel] === undefined) {
      throw new Error('channel not supported by driver');
    }

    return this.request(channel, payload).catch((reason) => {
      log.error({
        head: 'set error',
        attachment: reason
      });

      throw reason;
    });
  }

  indicator(on) {
    const { log, hasIndicator } = this._relayDriver;

    if (!hasIndicator) {
      throw new Error('driver has no indicator');
    }

    return this.request('indicator', on).then((result) => {
      if (result !== on) {
        throw new Error('could not set indicator');
      }

      return result;
    }).catch((reason) => {
      log.error({
        head: 'indicator error',
        attachment: reason
      });

      throw reason;
    });
  }

  indicatorBlink(count, quiet = false) {
    const { log, hasIndicator } = this._relayDriver;

    if (!hasIndicator) {
      throw new Error('driver has no indicator');
    }

    const blink = this.request('indicatorBlink', count).then((result) => {
      if (result !== count) {
        throw new Error('could not set indicatorBlink');
      }

      return result;
    });

    if (quiet) {
      return resolveAlways(blink);
    }

    return blink.catch((reason) => {
      log.error({
        head: 'indicator-blink error',
        attachment: reason
      });

      throw reason;
    });
  }

  getChannel(channel) {
    const { channels } = this._relayDriver;
    if (channels[channel] === undefined) {
      throw new Error('channel not supported by driver');
    }

    if (channels[channel] !== false) {
      throw new Error('channel already in use');
    }

    channels[channel] = true;

    return (power) => {
      return this._set(channel, power);
    };
  }

  // Public methods:
  // connect
  // disconnect
  // getChannel
}

class SonoffBasic extends RelayDriver {
  constructor(options) {
    super(Object.assign({}, {
      channels: 1,
      buttons: 1
    }, options));
  }
}

class RelayLight extends Base {
  constructor(options = {}) {
    super();

    const {
      driver = null,
      useChannel
    } = options;

    if (!driver
      || useChannel === undefined
      || !(driver instanceof RelayDriver)) {
      throw new Error('insufficient options provided');
    }

    this.driver = driver;

    this.powerSetpoint = false;
    this.power = null;

    this._relayLight = {
      setChannel: this.driver.getChannel(useChannel)
    };

    rebind(this, '_handleRelayDriverConnection');
    this.driver.on('reliableConnect', this._handleRelayDriverConnection);

    this._relayLight.log = this.log.withPrefix(libName);
  }

  _handleRelayDriverConnection() {
    this.setPower(this.powerSetpoint);
  }

  setPower(input) {
    const { log, setChannel } = this._relayLight;

    this.powerSetpoint = Boolean(input);

    this.emit('set');

    if (this.powerSetpoint === this.power) {
      return Promise.resolve(this.power);
    }

    return setChannel(this.powerSetpoint).then((result) => {
      if (result !== this.powerSetpoint) {
        // reset, as conflicting message suggest a hardware fail
        // resetting to null will make following requests go through regardless of state
        this.power = null;
        throw new Error('could not set power');
      }

      if (this.powerSetpoint !== this.power) {
        this.power = this.powerSetpoint;
        this.emit('change');
      }
      return this.power;
    }).catch((reason) => {
      log.error({
        head: 'power error',
        attachment: reason
      });

      throw reason;
    });
  }

  toggle() {
    return this.setPower(!this.powerSetpoint);
  }

  // Public methods:
  // connect
  // disconnect
  // setPower
  // toggle
  //
  // Public properties:
  // powerSetpoint
  // power
}

module.exports = {
  RelayDriver,
  RelayLight,
  SonoffBasic
};
