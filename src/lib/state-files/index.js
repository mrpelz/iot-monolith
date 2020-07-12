import {
  existsSync as exists,
  openSync as open,
  readFile as read,
  readFileSync as readSync,
  ftruncate as truncate,
  ftruncateSync as truncateSync,
  watch,
  writeFile as write,
  writeFileSync as writeSync
} from 'fs';
import { EventEmitter } from 'events';
import { Logger } from '../log/index.js';
import { join } from 'path';
import { rebind } from '../utils/oop.js';
import { tmpdir } from 'os';

const libName = 'state-files';

const tmp = tmpdir();

function makePath(name) {
  return join(tmp, `iot-state-[${name}].json`);
}

export class StateFile extends EventEmitter {
  constructor(name) {
    if (!name) {
      throw new Error('name not defined!');
    }

    super();

    const path = makePath(name);
    const fileExists = exists(path);

    this._descriptor = open(path, fileExists ? 'r+' : 'w+');

    this._doWatch = true;
    this._name = name;

    rebind(this, '_handleChange');

    const log = new Logger();
    log.friendlyName(path);
    this.log = log.withPrefix(libName);

    this.log.info(`state-file is ${fileExists ? 'old' : 'new'}`);

    this._watcher = watch(path, { persistent: false }, this._handleChange);
  }

  _handleChange(type) {
    if (!this._doWatch) {
      return;
    }

    if (type === 'change') {
      this.log.info('state-file changed');
      this.emit('change');
    }
  }

  set(data) {
    if (typeof data !== 'object') {
      throw new Error('data is not an object!');
    }

    let json;

    try {
      json = JSON.stringify(data, null, null);
    } catch (error) {
      throw new Error('could not JSON-stringify data!');
    }

    return new Promise((resolve, reject) => {
      this._doWatch = false;

      truncate(this._descriptor, (truncateError) => {
        if (truncateError) {
          this.log.error('error emptying state-file');
          reject(truncateError);
          return;
        }

        write(
          this._descriptor,
          Buffer.from(json),
          (writeError) => {
            this._doWatch = true;

            if (writeError) {
              this.log.error('error writing state-file');
              reject(writeError);
              return;
            }

            this.log.info('written state-file');
            resolve();
          }
        );
      });
    });
  }

  setSync(data) {
    if (typeof data !== 'object') {
      throw new Error('data is not an object!');
    }

    let json;

    try {
      json = JSON.stringify(data, null, null);
    } catch (error) {
      throw new Error('could not JSON-stringify data!');
    }

    try {
      truncateSync(this._descriptor);
    } catch (truncateError) {
      this.log.error('error emptying state-file');
      throw truncateError;
    }

    try {
      writeSync(this._descriptor, Buffer.from(json));
    } catch (writeError) {
      this.log.error('error writing state-file');
      throw writeError;
    }

    this.log.info('written state-file');

    return undefined;
  }

  get() {
    return new Promise((resolve, reject) => {
      read(
        this._descriptor,
        (readError, data) => {
          if (readError) {
            this.log.error('error reading state-file');
            reject(readError);
            return;
          }

          try {
            const json = data.toString();
            const payload = json.length ? JSON.parse(json) : null;
            this.log.info('read state-file');

            resolve(payload);
          } catch (parseError) {
            this.log.error('error parsing content of state-file');
            reject(parseError);
          }
        }
      );
    });
  }

  getSync() {
    let data;
    let payload;

    try {
      data = readSync(this._descriptor);
    } catch (readError) {
      this.log.error('error reading state-file');
      throw readError;
    }

    try {
      const json = data.toString();
      payload = json.length ? JSON.parse(json) : null;
    } catch (parseError) {
      this.log.error('error parsing content of state-file');
      throw parseError;
    }

    this.log.info('read state-file');

    return payload;
  }
}
