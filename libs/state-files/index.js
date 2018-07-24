const EventEmitter = require('events');
const {
  openSync: open,
  readFile: read,
  watch,
  writeFile: write
} = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

// const { Logger } = require('../log');
const { rebind } = require('../utils/oop');

const tmp = tmpdir();

function makePath(name) {
  return join(tmp, name);
}

class StateFile extends EventEmitter {
  constructor(name) {
    if (!name) {
      throw new Error('name not defined!');
    }

    super();

    const path = makePath(name);

    this._doWatch = true;
    this._name = name;

    this._descriptor = open(path, 'w+');

    rebind(this, '_handleChange');

    this._watcher = watch(path, { persistent: false }, this._handleChange);
  }

  _handleChange(type) {
    if (!this._doWatch) {
      return;
    }

    if (type === 'change') {
      this.emit('change');
    }
  }

  set(data) {
    if (typeof data !== 'object') {
      throw new Error('data is not an object!');
    }

    return new Promise((resolve, reject) => {
      this._doWatch = false;

      write(
        this._descriptor,
        Buffer.from(JSON.stringify(data, undefined, 2)),
        (error) => {
          this._doWatch = true;

          if (error) {
            reject(error);
          }

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
            reject(error);
          }

          try {
            resolve(JSON.parse(data.toString()));
          } catch (parseError) {
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
