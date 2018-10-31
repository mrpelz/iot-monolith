const {
  existsSync: exists,
  ftruncateSync: truncate,
  openSync: open,
  readFileSync: read,
  writeFileSync: write
} = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const { Logger } = require('../log');
const { rebind } = require('../utils/oop');

const libName = 'db';

const path = join(tmpdir(), 'iot-db.json');

class Db {
  constructor() {
    this._descriptor = open(path, exists(path) ? 'r+' : 'w+');

    rebind(this, '_onShutdown');

    const log = new Logger();
    log.friendlyName(path);
    this.log = log.withPrefix(libName);

    this._data = this._onInit() || {};
    process.on('exit', this._onShutdown);

    return this._data;
  }

  _onInit() {
    let data;
    let payload;

    try {
      data = read(this._descriptor);
    } catch (readError) {
      this.log.error('error reading db-file');
      throw readError;
    }

    try {
      const json = data.toString();
      payload = json.length ? JSON.parse(json) : null;
    } catch (parseError) {
      this.log.error('error parsing content of db-file');
      throw parseError;
    }

    this.log.info('read db-file');

    return payload;
  }

  _onShutdown() {
    const { _data: data } = this;

    if (typeof data !== 'object') {
      throw new Error('db-data is not an object!');
    }

    let json;

    try {
      json = JSON.stringify(data, null, null);
    } catch (error) {
      throw new Error('could not JSON-stringify db-data!');
    }

    try {
      truncate(this._descriptor);
    } catch (truncateError) {
      this.log.error('error emptying db-file');
      throw truncateError;
    }

    try {
      write(this._descriptor, Buffer.from(json));
    } catch (writeError) {
      this.log.error('error writing db-file');
      throw writeError;
    }

    this.log.info('written db-file');
  }
}

module.exports = {
  Db
};
