const { MessageClient } = require('../messaging');
const {
  readNumber,
  writeNumber
} = require('../utils/data');

const libName = 'vent';

const messageTypes = [
  {
    name: 'actualIn',
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([1, 0])
  },
  {
    name: 'actualOut',
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([1, 1])
  },
  {
    name: 'target',
    generator: (input) => {
      return writeNumber(input, 1);
    },
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([2])
  },
  {
    name: 'switch',
    eventName: 'switch',
    eventParser: (payload) => {
      return readNumber(payload.slice(1), 2);
    },
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([3])
  }
];

class Vent extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes
    });

    this._switch = {};


    this.log.friendlyName(`ventcontroller (${host}:${port})`);
    this._switch.log = this.log.withPrefix(libName);
  }

  set(name, input) {
    const {
      state: {
        isConnected
      }
    } = this._persistentSocket;

    const { log } = this._switch;

    if (!isConnected) {
      return Promise.reject(new Error('device not connected'));
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
  Vent
};
