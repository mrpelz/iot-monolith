const EventEmitter = require('events');
const {
  existsSync: exists,
  openSync: open,
  readFile: read,
  watch,
  writeFile: write
} = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const { Logger } = require('../log');
const { rebind } = require('../utils/oop');

const libName = 'state-files';

const tmp = tmpdir();

function makePath(name) {
  return join(tmp, `iot-state-[${name}].json`);
}

class StateFile extends EventEmitter {
  constructor(name, doWatch = false) {
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

    if (doWatch) {
      this._watcher = watch(path, { persistent: false }, this._handleChange);
    }

    const log = new Logger();
    log.friendlyName(this._path);
    this.log = log.withPrefix(libName);

    this.log.info(`state-file is ${fileExists ? 'old' : 'new'}`);
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
      json = JSON.stringify(data, null, 2);
    } catch (error) {
      throw new Error('could not JSON-stringify data!');
    }

    return new Promise((resolve, reject) => {
      this._doWatch = false;

      write(
        this._descriptor,
        Buffer.from(json),
        (error) => {
          this._doWatch = true;

          if (error) {
            this.log.error('error writing state-file');
            reject(error);
          }

          this.log.info('written state-file');
          resolve();
        }
      );
    });
  }

  get() {
    return new Promise((resolve, reject) => {
      read(
        this._descriptor,
        (error, data) => {
          if (error) {
            this.log.error('error reading state-file');
            reject(error);
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
}

module.exports = {
  StateFile
};
