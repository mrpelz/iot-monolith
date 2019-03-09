const { Base } = require('../base');
const { MessageClient } = require('../messaging');
const {
  booleanToBuffer,
  bufferToBoolean,
  readNumber,
  writeNumber
} = require('../utils/data');
const { ledCalc, transitions } = require('../utils/math');
const { Remap } = require('../utils/logic');
const { rebind, resolveAlways } = require('../utils/oop');

const libName = 'led';

const minCycle = 0;
const maxCycle = 255;

const remap = new Remap([{
  logic: [0, 1, false],
  cycle: [minCycle, maxCycle, true],
  percent: [0, 100, true]
}]);

function createAnimationPayload(from, to, duration) {
  const animation = ledCalc(from, to, duration, transitions.easeOutCubic, maxCycle);
  if (!animation) return null;

  return Buffer.concat(
    animation.map((frame) => {
      return Buffer.concat([
        writeNumber(frame.time, 4),
        writeNumber(frame.value, 1)
      ]);
    })
  );
}

function getMessageTypes(channels) {
  return [
    ...new Array(channels).fill(undefined).map((_, index) => {
      return {
        eventName: index,
        eventParser: (input) => {
          return bufferToBoolean(input.slice(2));
        },
        head: Buffer.from([1, index]),
        name: index,
        parser: readNumber
      };
    }),
    {
      generator: booleanToBuffer,
      head: Buffer.from([0, 0]),
      name: 'indicator',
      parser: bufferToBoolean
    },
    {
      generator: writeNumber,
      head: Buffer.from([2, 0]),
      name: 'indicatorBlink',
      parser: readNumber
    }
  ];
}

class LedDriver extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      channels = 0,
      hasIndicator = true
    } = options;

    if (!host || !port || !channels) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: getMessageTypes(channels),
      lengthBytes: 2
    });

    this._ledDriver = {
      channels: new Array(channels).fill(false),
      hasIndicator
    };

    this.log.friendlyName(`Driver ${host}:${port}`);
    this._ledDriver.log = this.log.withPrefix(libName);
  }

  _set(channel, payload) {
    const {
      state: {
        isConnected
      }
    } = this._reliableSocket;

    const { channels, log } = this._ledDriver;

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
    const { log, hasIndicator } = this._ledDriver;

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
    const { log, hasIndicator } = this._ledDriver;

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
    const { channels } = this._ledDriver;
    if (channels[channel] === undefined) {
      throw new Error('channel not supported by driver');
    }

    if (channels[channel] !== false) {
      throw new Error('channel already in use');
    }

    channels[channel] = true;

    return (brightness) => {
      return this._set(channel, brightness);
    };
  }

  // Public methods:
  // connect
  // disconnect
  // getChannel
}

class LedLight extends Base {
  constructor(options = {}) {
    super();

    const {
      driver = null,
      useChannel
    } = options;

    if (!driver
      || useChannel === undefined
      || !(driver instanceof LedDriver)) {
      throw new Error('insufficient options provided');
    }

    this.driver = driver;

    this.brightnessSetpoint = 0;
    this.brightness = null;

    this._ledLight = {
      setChannel: this.driver.getChannel(useChannel)
    };

    rebind(this, '_handleLedDriverConnection');
    this.driver.on('reliableConnect', this._handleLedDriverConnection);

    this._ledLight.log = this.log.withPrefix(libName);
  }

  get power() {
    return Boolean(this.brightness);
  }

  _handleLedDriverConnection() {
    this.setBrightness(this.brightness);
  }

  setBrightness(input, duration = 0) {
    const { log, setChannel } = this._ledLight;

    this.brightnessSetpoint = input;

    this.emit('set');

    if (this.brightnessSetpoint === this.brightness) {
      return Promise.resolve(this.brightness);
    }

    const cycle = remap.convert('logic', 'cycle', this.brightnessSetpoint);

    const payload = createAnimationPayload(this.brightness, this.brightnessSetpoint, duration);
    if (payload === null) {
      return Promise.resolve(this.brightness);
    }
    if (payload.length > 1275) {
      return Promise.reject(new Error('animation sequence is too long'));
    }

    // Complete message:
    // length (2 bytes) + ID + CMD + index + target cycle + animation-payload (max. 1275 bytes)
    // = 1279 bytes
    return setChannel(
      Buffer.concat([
        writeNumber(cycle, 1),
        payload
      ])
    ).then((result) => {
      if (result !== cycle) {
        // reset, as conflicting message suggest a hardware fail
        // resetting to null will make following requests go through regardless of state
        this.brightness = null;
        throw new Error('could not set brightness');
      }

      const brightness = remap.convert('cycle', 'logic', result);

      if (brightness !== this.brightness) {
        this.brightness = this.brightnessSetpoint;
        this.emit('change');
      }
      return this.brightness;
    }).catch((reason) => {
      log.error({
        head: 'brightness error',
        attachment: reason
      });

      throw reason;
    });
  }

  toggle() {
    if (this.brightness === 0) {
      return this.setBrightness(1);
    }

    return this.setBrightness(0);
  }

  setPower(on) {
    if (on) {
      return this.setBrightness(1);
    }

    return this.setBrightness(0);
  }

  // Public methods:
  // connect
  // disconnect
  // setBrightness
  // toggle
  // setPower
  //
  // Public properties:
  // brightness
  // power
}

class RGBLed {
  constructor(options = {}) {
    const {
      driver = null,
      r,
      g,
      b
    } = options;

    if (!driver
      || r === undefined
      || g === undefined
      || b === undefined
      || !(driver instanceof LedDriver)) {
      throw new Error('insufficient options provided');
    }

    this.driver = driver;

    this.r = new LedLight({
      driver,
      useChannel: r
    });

    this.g = new LedLight({
      driver,
      useChannel: g
    });

    this.b = new LedLight({
      driver,
      useChannel: b
    });
  }

  setColor(r = 0, g = 0, b = 0, duration = 0) {
    return Promise.all([
      this.r.setBrightness(r, duration),
      this.g.setBrightness(g, duration),
      this.b.setBrightness(b, duration)
    ]);
  }
}

module.exports = {
  LedDriver,
  LedLight,
  RGBLed
};
