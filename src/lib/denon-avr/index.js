import { PersistentSocket } from '../tcp/index.js';
import { rebind } from '../utils/oop.js';

const libName = 'denon-avr';

const apiDelimiter = 0x0d;
const apiEncoding = 'ascii';
const apiTimeout = 200;

function findMatchingCall(calls, input) {
  return Object.keys(calls).find((cmd) => {
    return input.startsWith(cmd);
  });
}

export class DenonAvr extends PersistentSocket {
  constructor(options = {}) {
    const {
      host = null,
      port = 23
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      delimiter: apiDelimiter
    });

    this._denonAvr = {
      calls: {}
    };

    rebind(this, '_handleResponse');
    this.on('data', this._handleResponse);

    this.log.friendlyName(`${host}:${port}`);
    this._denonAvr.log = this.log.withPrefix(libName);
  }

  _handleResponse(input) {
    const { calls } = this._denonAvr;

    const payload = input.toString(apiEncoding);
    const match = findMatchingCall(calls, payload);

    const { [match]: resolver } = calls;

    if (resolver) {
      resolver(payload);
    } else {
      this.emit('event', payload);
    }
  }

  request(cmd, parameter = '') {
    if (!cmd) {
      throw new Error('no cmd specified');
    }

    const { calls, log } = this._denonAvr;

    if (calls[cmd]) {
      return Promise.reject(new Error(`already running call for ${cmd}`));
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (calls[cmd]) {
          reject(new Error(`call ${cmd} timed out after ${apiTimeout}ms`));
          delete calls[cmd];
        }
      }, apiTimeout);

      calls[cmd] = (input) => {
        resolve(input);
        clearTimeout(timeoutId);
        delete calls[cmd];
      };

      this.write(Buffer.from(`${cmd}${parameter}`, apiEncoding));
    }).catch((reason) => {
      log.error({
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
