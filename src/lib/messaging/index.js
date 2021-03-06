import { emptyBuffer, readNumber } from '../utils/data.js';
import { ReliableSocket } from '../tcp/index.js';
import { rebind } from '../utils/oop.js';
import { sleep } from '../utils/time.js';

const libName = 'messaging';

const minCallId = 1;
const maxCallId = 254;
const eventId = 0;
const keepAliveId = 255;

const defaultTimeout = 5000;

function prepareMessageTypes(types) {
  return types.map((msg) => {
    const {
      eventName = null,
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
  const inUse = Object.keys(state.calls);
  let id = state.callCount;

  if (id >= maxCallId) {
    state.callCount = minCallId;
  } else {
    state.callCount += 1;
  }

  while (inUse.includes(id)) {
    id = callId(state);
  }
  return id;
}

export class MessageClient extends ReliableSocket {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      lengthBytes = 1,
      timeout = 2000,
      messageTypes = []
    } = options;

    if (!host || !port || !messageTypes.length) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      keepAlive: timeout,
      lengthPreamble: lengthBytes
    });

    this._messaging = {};

    this._messaging.types = prepareMessageTypes(messageTypes);

    this._messaging.state = {
      callCount: minCallId,
      calls: {}
    };

    rebind(this, '_handleResponse', '_handleDisconnection');
    this.on('data', this._handleResponse);
    this.on('disconnect', this._handleDisconnection);

    this.log.friendlyName(`${host}:${port}`);
    this._messaging.log = this.log.withPrefix(libName);
  }

  _emitEvent(payload) {
    const {
      types
    } = this._messaging;
    const msg = findRequestPatternMatch(types, payload);

    if (msg && msg.eventName) {
      const data = msg.eventParser(payload);
      this.emit(msg.eventName, msg.name, data);
    }
  }

  _handleDisconnection() {
    const {
      log,
      state: { calls }
    } = this._messaging;

    const callIds = Object.keys(calls);

    if (!callIds.length) {
      return;
    }

    log.notice('disconnect call abortion');
    const errorMsg = 'call aborted due to disconnection';

    callIds.forEach((id) => {
      const { [id]: resolver } = calls;

      resolver(errorMsg);
    });
  }

  _handleResponse(data) {
    const {
      state: { calls }
    } = this._messaging;

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
          resolver(null, payload);
        }
    }
  }

  request(name, data = emptyBuffer, quietParse = false) {
    const {
      state: {
        isConnected
      }
    } = this._reliableSocket;

    const {
      log,
      state,
      state: { calls },
      types
    } = this._messaging;

    if (!isConnected) {
      return Promise.reject(new Error('socket is not connected!'));
    }

    const msg = findRequestNameMatch(types, name);

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

    const id = callId(state);
    const payload = generator(data);

    const timeoutHandler = sleep(timeout).then(() => {
      if (calls[id]) {
        delete calls[id];
      }

      throw new Error(`call timed out after ${timeout}ms`);
    });

    const responseHandler = new Promise((resolve, reject) => {
      calls[id] = (error, input) => {
        if (error) {
          reject(new Error(error));
        } else {
          try {
            resolve(parser(input));
          } catch (parseError) {
            if (quietParse) {
              resolve();
            } else {
              reject(new Error(`parse error: ${parseError}`));
            }
          }
        }

        delete calls[id];
      };

      this.write(Buffer.concat([
        Buffer.from([id]),
        head,
        payload,
        tail
      ]));
    });

    return Promise.race([timeoutHandler, responseHandler]).catch((reason) => {
      log.warning({
        head: 'request error',
        attachment: reason
      });

      throw reason;
    });
  }

  // Public methods:
  // connect
  // disconnect
  // request
}
