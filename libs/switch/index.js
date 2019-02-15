const { MessageClient } = require('../messaging');
const {
  bufferToBoolean,
  booleanToBuffer,
  readNumber,
  writeNumber
} = require('../utils/data');
const { rebind } = require('../utils/oop');
const { camel } = require('../utils/string');

const libName = 'switch';

const messageHeads = {
  indicator: 0,
  output: 1,
  button: 2,
  blink: 3
};

const eventValueMappings = {
  0: 'down',
  1: 'up',
  2: 'shortpress',
  3: 'longpress'
};

function getMessageTypesForCapabilities(capabilities) {
  return capabilities.map((capability) => {
    const {
      name,
      type,
      index,
      isBoolean,
      events
    } = capability;
    const { [type]: cmd } = messageHeads;

    if (cmd === undefined) {
      throw new Error('capability type unknown');
    }

    const parser = isBoolean ? bufferToBoolean : readNumber;
    const generator = isBoolean ? booleanToBuffer : writeNumber;

    const eventName = events ? name : undefined;
    const eventParser = events ? (input) => {
      return readNumber(input.slice(2), 1);
    } : undefined;

    return {
      eventName,
      eventParser,
      generator,
      head: Buffer.from([cmd, index]),
      name,
      parser
    };
  });
}

function getCapabilityNames(capabilities) {
  return capabilities.map(({ name }) => { return name; });
}

function setUpListeners(capabilities, addListener) {
  capabilities.forEach((capability) => {
    const {
      name,
      events
    } = capability;

    if (events) {
      addListener(name);
    }
  });
}

class Switch extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      capabilities = []
    } = options;

    if (!host || !port || !capabilities.length) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: getMessageTypesForCapabilities(capabilities)
    });

    this._switch = {};
    this._switch.capabilities = getCapabilityNames(capabilities);

    rebind(this, '_addListener', '_handleEvent');
    setUpListeners(capabilities, this._addListener);

    this.log.friendlyName(`${host}:${port}`);
    this._switch.log = this.log.withPrefix(libName);
  }

  _addListener(name) {
    this.on(name, this._handleEvent);
  }

  _handleEvent(name, data) {
    const { [data]: eventType } = eventValueMappings;

    if (eventType) {
      this.emit(camel(name, eventType));
    }
  }

  set(name, input) {
    const {
      state: {
        isConnected
      }
    } = this._reliableSocket;

    const { capabilities, log } = this._switch;

    if (!isConnected) {
      return Promise.reject(new Error('device not connected'));
    }

    if (!capabilities.includes(name)) {
      throw new Error('capability is not configured');
    }

    return this.request(name, input).catch((reason) => {
      log.error({
        head: 'set error',
        attachment: reason
      });
    });
  }

  // Public methods:
  // connect
  // disconnect
  // set
}

module.exports = {
  Switch
};
