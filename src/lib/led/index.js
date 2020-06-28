import { booleanToBuffer, bufferToBoolean, readNumber, writeNumber } from '../utils/data.js';
import { ledCalc, transitions } from '../utils/math.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { Base } from '../base/index.js';
import { MessageClient } from '../messaging/index.js';
import { Remap } from '../utils/logic.js';

const libName = 'led';

const minCycle = 0;
const maxCycle = 255;

const defaultAnimationDuration = 1000;
const defaultGamma = 2.8;
const defaultBrightnessSteps = [0, 0.2, 0.4, 0.6, 0.8, 1];
const defaultRGBPresets = {
  red: { r: 1, g: 0, b: 0 },
  orange: { r: 1, g: 0.5, b: 0 },
  yellow: { r: 1, g: 1, b: 0 },
  chartreuse: { r: 0.5, g: 1, b: 0 },
  green: { r: 0, g: 1, b: 0 },
  spring: { r: 0, g: 1, b: 0.5 },
  cyan: { r: 0, g: 1, b: 1 },
  azure: { r: 0, g: 0.5, b: 1 },
  blue: { r: 0, g: 0, b: 1 },
  violet: { r: 0.5, g: 0, b: 1 },
  magenta: { r: 1, g: 0, b: 1 },
  rose: { r: 1, g: 0, b: 0.5 }
};

const remap = new Remap([{
  logic: [0, 1, false],
  cycle: [minCycle, maxCycle, true],
  percent: [0, 100, true]
}]);

function createAnimationPayload(from, to, duration, gamma) {
  if (from === null) return null;

  const animation = ledCalc(from, to, duration, transitions.easeOutQuad, maxCycle, gamma);
  if (!animation) return null;

  // console.log(JSON.stringify(animation, null, 2));

  return Buffer.concat(
    animation.map((frame) => {
      return Buffer.concat([
        writeNumber(frame.time, 4),
        writeNumber(frame.value, 1)
      ]);
    })
  );
}

function getClosestStep(steps = [], input = 0) {
  const closest = [...steps].sort((a, b) => {
    return Math.abs(input - a) - Math.abs(input - b);
  })[0];

  if (closest === undefined) return null;

  return steps.indexOf(closest);
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

export class LedDriver extends MessageClient {
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

export class H801 extends LedDriver {
  constructor(options) {
    super(Object.assign({}, {
      channels: 5
    }, options));
  }
}

export class LedLight extends Base {
  constructor(options = {}) {
    super();

    const {
      driver = null,
      duration = defaultAnimationDuration,
      gamma = defaultGamma,
      useChannel,
      steps = defaultBrightnessSteps
    } = options;

    if (!driver
      || duration === undefined
      || gamma === undefined
      || useChannel === undefined
      || !(driver instanceof LedDriver)
      || !steps.length) {
      throw new Error('insufficient options provided');
    }

    this.driver = driver;

    this.brightnessSetpoint = 0;
    this.brightness = null;

    this._ledLight = {
      duration,
      gamma,
      setChannel: this.driver.getChannel(useChannel),
      steps
    };

    rebind(this, '_handleLedDriverConnection');
    this.driver.on('reliableConnect', this._handleLedDriverConnection);

    this._ledLight.log = this.log.withPrefix(libName);
  }

  get powerSetpoint() {
    return Boolean(this.brightnessSetpoint);
  }

  get power() {
    if (this.brightness === null) return null;

    return Boolean(this.brightness);
  }

  get brightnessPercentage() {
    return remap.convert('logic', 'percent', this.brightness);
  }

  _handleLedDriverConnection() {
    this.setBrightness(this.brightnessSetpoint, 0);
  }

  setBrightness(input, duration) {
    if (input < 0 || input > 1 || Number.isNaN(input)) {
      throw new Error('brightness input out of range');
    }

    const {
      duration: defaultDuration,
      gamma,
      log,
      setChannel
    } = this._ledLight;

    const animationDuration = typeof duration === 'number' ? duration : defaultDuration;

    this.brightnessSetpoint = input;

    this.emit('set');

    if (this.brightnessSetpoint === this.brightness) {
      return Promise.resolve(this.brightness);
    }

    const cycle = remap.convert('logic', 'cycle', this.brightnessSetpoint);

    let payload;

    payload = createAnimationPayload(
      this.brightness,
      this.brightnessSetpoint,
      animationDuration,
      gamma
    );

    if (!payload) {
      payload = Buffer.from([
        writeNumber(0, 4),
        writeNumber(cycle, 1)
      ]);
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
    return this.setPower(!this.powerSetpoint);
  }

  setPower(on) {
    if (on) {
      return this.setBrightness(1);
    }

    return this.setBrightness(0);
  }

  increase(up, duration) {
    const { steps } = this._ledLight;

    const currentStep = getClosestStep(steps, this.brightnessSetpoint);
    let step = currentStep + (up ? 1 : -1);

    if (step < 0) {
      step = steps.length - 1;
    } else if (step > steps.length - 1) {
      step = 0;
    }

    const newBrightness = steps[step];

    return this.setBrightness(newBrightness, duration);
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

export class RGBLed {
  constructor(options = {}) {
    const {
      driver = null,
      r,
      g,
      b,
      duration = defaultAnimationDuration,
      gamma = defaultGamma,
      presets = defaultRGBPresets
    } = options;

    const allLightInstances = r instanceof LedLight
      && g instanceof LedLight
      && b instanceof LedLight;

    if (!driver
      || r === undefined
      || g === undefined
      || b === undefined
      || !(driver instanceof LedDriver)
      || (
        // only require duration and gamma
        // if LedLight-instaces are to be created inside this instance
        !allLightInstances
        && (duration === undefined || gamma === undefined)
      )
    ) {
      throw new Error('insufficient options provided');
    }

    this.driver = driver;

    this.r = r instanceof LedLight ? r : new LedLight({
      driver,
      duration,
      gamma,
      useChannel: r
    });

    this.g = g instanceof LedLight ? g : new LedLight({
      driver,
      duration,
      gamma,
      useChannel: g
    });

    this.b = b instanceof LedLight ? b : new LedLight({
      driver,
      duration,
      gamma,
      useChannel: b
    });

    this._presets = presets;
  }

  setColor(r = 0, g = 0, b = 0, duration) {
    return Promise.all([
      this.r.setBrightness(r, duration),
      this.g.setBrightness(g, duration),
      this.b.setBrightness(b, duration)
    ]);
  }

  setPreset(name, duration) {
    const { [name]: preset } = this._presets;
    if (!preset) return Promise.reject(new Error('no preset with this name'));

    const { r, g, b } = preset;

    return this.setColor(r, g, b, duration);
  }
}
