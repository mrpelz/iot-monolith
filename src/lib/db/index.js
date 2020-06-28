import { RecurringMoment, every } from '../utils/time.js';
import {
  existsSync as exists,
  openSync as open,
  readFileSync as read,
  ftruncateSync as truncate,
  writeFileSync as write,
} from 'fs';
import { Logger } from '../log/index.js';
import { join } from 'path';
import { rebind } from '../utils/oop.js';
import { tmpdir } from 'os';

const libName = 'db';

const path = join(tmpdir(), 'iot-db.json');

export class Db {
  constructor(options = {}) {
    const {
      saveInterval = null,
      scheduler = null
    } = options;

    if (!saveInterval || !scheduler) {
      throw new Error('insufficient options provided');
    }

    this._descriptor = open(path, exists(path) ? 'r+' : 'w+');

    rebind(this, '_onSave');

    const log = new Logger();
    log.friendlyName(path);
    this.log = log.withPrefix(libName);

    this._data = this._onInit() || {};
    process.on('exit', this._onSave);

    new RecurringMoment(
      { scheduler },
      every.parse(saveInterval)
    ).on('hit', this._onSave);

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

  _onSave() {
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

  save() {
    this._onSave();
  }
}
