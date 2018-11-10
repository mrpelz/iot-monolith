const { MessageClient } = require('../messaging');
const {
  bufferToBoolean,
  readNumber,
  writeNumber
} = require('../utils/data');

const libName = 'led';

function getMessageTypes(channels) {
  return Array(channels).map((_, index) => {
    return {
      eventName: index,
      eventParser: (input) => {
        return bufferToBoolean(input.slice(2));
      },
      generator: writeNumber,
      head: Buffer.from([1, index]),
      name: index,
      parser: readNumber
    };
  });
}

class LedDriver extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      channels = 0
    } = options;

    if (!host || !port || !channels) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: getMessageTypes(channels)
    });

    this._ledDriver = {
      channels: Array(channels).fill(false)
    };

    this.log.friendlyName(`Driver ${host}:${port}`);
    this._ledDriver.log = this.log.withPrefix(libName);
  }

  _set(channel, brightness) {
    const {
      state: {
        isConnected
      }
    } = this._persistentSocket;

    const { channels, log } = this._ledDriver;

    if (!isConnected) {
      return Promise.reject(new Error('driver not connected'));
    }

    if (channels[channel] === undefined) {
      throw new Error('channel not supported by driver');
    }

    return this.request(channel, brightness).catch((reason) => {
      log.error({
        head: 'set error',
        attachment: reason
      });
    });
  }

  getChannel(channel) {
    if (this.channels[channel] === undefined) {
      throw new Error('channel not supported by driver');
    }

    if (this.channels[channel] !== false) {
      throw new Error('channel already in use');
    }

    this.channels[channel] = true;

    return {
      set: (brightness) => {
        return this._set(channel, brightness);
      }
    };
  }

  // Public methods:
  // connect
  // disconnect
  // getChannel
}

class LedLight {
  constructor(options = {}) {
    const {
      driver = null,
      useChannel = 0
    } = options;

    if (!driver || useChannel === undefined) {
      throw new Error('insufficient options provided');
    }

    this.brightness = 0;

    this._ledLight = {
      set: driver.getChannel(useChannel)
    };

    this._ledLight.log = this.log.withPrefix(libName);
  }

  brightness(input) {
    const { log, set } = this._ledDriver;

    const cycle = Math.round(Math.abs(Number(input)) * 255);

    return set(cycle).then((value) => {
      if (value !== cycle) {
        throw new Error('could not set brightness');
      }

      const brightness = value / 255;

      if (brightness !== this.brightness) {
        this.brightness = brightness;
        this.emit('change');
      }
      return brightness;
    }).catch((reason) => {
      log.error({
        head: 'brightness error',
        attachment: reason
      });
    });
  }

  toggle() {
    if (this.brightness === 0) {
      return this.brightness(1);
    }

    return this.brightness(0);
  }

  // Public methods:
  // connect
  // disconnect
  // brightness
  // toggle
}

module.exports = {
  LedDriver,
  LedLight
};
