const EventEmitter = require('events');

const { rebind } = require('../utils/oop');
const { emptyBuffer, readNumber } = require('../utils/data');
const { PersistentSocket } = require('../tcp');
const { Logger } = require('../log');

const logPrefix = 'messaging';
const { log } = new Logger(logPrefix);

const minCallId = 1;
const maxCallId = 254;
const eventId = 0;
const keepAliveId = 255;

const defaultTimeout = 5000;

function prepareMessageTypes(types) {
  return types.map((msg) => {
    const {
      eventName,
      eventParser = (x) => { return x; },
      generator = (x) => { return x; },
      head = emptyBuffer,
      name,
      parser = (x) => { return x; },
      tail = emptyBuffer,
      timeout = defaultTimeout
    } = msg;

    return {
      eventName,
      eventParser,
      generator,
      head,
      name,
      parser,
      tail,
      timeout
    };
  });
}

function bufferBeginsWith(input, head) {
  if (!head || !head.length) {
    return true;
  }
  return [...head].reduce((acc, curr, index) => {
    return acc && (curr === input[index]);
  }, true);
}

function bufferEndsWith(input, tail) {
  if (!tail || !tail.length) {
    return true;
  }
  const start = input.length - tail.length;
  return [...tail].reduce((acc, curr, index) => {
    return acc && (curr === input[start + index]);
  }, true);
}

function findRequestNameMatch(types, name) {
  return types.find((msg) => {
    return msg.name === name;
  });
}

function findRequestPatternMatch(types, input) {
  return types.find((msg) => {
    return bufferBeginsWith(input, msg.head) && bufferEndsWith(input, msg.tail);
  });
}

function callId(state) {
  const id = state.callCount;

  if (id >= maxCallId) {
    state.callCount = minCallId;
  } else {
    state.callCount += 1;
  }

  return id;
}

class MessageClient extends EventEmitter {
  constructor(options) {
    super();

    const {
      host = null,
      port = null,
      lengthBytes = 1,
      timeout = 10000,
      messageTypes = []
    } = options;

    if (!host || !port || !messageTypes.length) {
      throw new Error('insufficient options provided');
    }

    this._socket = new PersistentSocket({
      host,
      port,
      keepAlive: {
        send: true,
        receive: true,
        time: timeout,
        data: Buffer.from([0xff])
      },
      lengthPreamble: lengthBytes,
      delimiter: false
    });

    this._types = prepareMessageTypes(messageTypes);

    this._state = {
      isConnected: false,
      callCount: minCallId,
      calls: {}
    };

    rebind(this, '_handleData');

    this._socket.on('connect', () => {
      this._state.isConnected = true;
      this.emit('connect');
    });

    this._socket.on('disconnect', () => {
      this._state.isConnected = false;
      this.emit('disconnect');
    });

    this._socket.on('data', this._handleData);
  }

  _emitEvent(payload) {
    const {
      _types
    } = this;
    const msg = findRequestPatternMatch(_types, payload);

    if (msg && msg.eventName) {
      const data = msg.eventParser(payload);
      this.emit(msg.eventName, msg.name, data);
    }
  }

  _handleData(data) {
    const {
      _state: { calls }
    } = this;

    const id = readNumber(data.slice(0, 1), 1);
    const payload = data.slice(1);
    const { [id]: resolver } = calls;

    switch (id) {
      case keepAliveId:
        break;
      case eventId:
        this._emitEvent(payload);
        break;
      default:
        if (resolver) {
          resolver(payload);
        }
    }
  }

  request(name, data = emptyBuffer) {
    const {
      _socket,
      _state,
      _state: { calls, isConnected },
      _types
    } = this;

    if (!isConnected) {
      throw new Error('socket is not connected!');
    }

    const msg = findRequestNameMatch(_types, name);

    if (!msg) {
      throw new Error(`no configured request for "${name}"`);
    }

    const {
      head,
      tail,
      parser,
      generator,
      timeout
    } = msg;

    const id = callId(_state);
    const payload = generator(data);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (calls[id]) {
          reject(new Error(`call timed out after ${timeout}ms`));
          delete calls[id];
        }
      }, timeout);

      calls[id] = (input) => {
        resolve(parser(input));
        clearTimeout(timeoutId);
        delete calls[id];
      };

      _socket.write(Buffer.concat([
        Buffer.from([id]),
        head,
        payload,
        tail
      ]));
    }).catch((reason) => {
      log(reason);
    });
  }

  start() {
    const { _socket } = this;
    _socket.connect();
  }

  stop() {
    const { _socket } = this;
    _socket.disconnect();
  }

  // Public methods:
  // start
  // stop
  // request
}

module.exports = {
  MessageClient
};
