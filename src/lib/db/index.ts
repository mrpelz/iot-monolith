import { RecurringMoment, Scheduler, every } from '../utils/time.js';
import { readFileSync as read, writeFileSync as write } from 'fs';
import { Input } from '../log/index.js';
import { getKey } from '../utils/structures.js';
import { join } from 'path';
import { logger } from '../../app/logging.js';
import { rebind } from '../utils/oop.js';
import { tmpdir } from 'os';

const path = join(tmpdir(), 'iot-db.json');

export class Db {
  log: Input;

  private data: Record<string, unknown> | null;

  constructor(saveInterval: string, scheduler: Scheduler) {
    this.log = logger.getInput({
      head: 'db',
    });

    rebind(this, 'onSave');

    this.data = this.onInit() || {};
    process.on('exit', this.onSave);

    new RecurringMoment({ scheduler }, every.parse(saveInterval)).on(
      'hit',
      this.onSave
    );
  }

  private onInit() {
    let data: ArrayBuffer;
    let payload: Record<string, unknown> | null;

    try {
      data = read(path);
    } catch (_) {
      this.log.error(() => 'error reading db-file');
      return null;
    }

    try {
      const json = data.toString();

      if (!json.length) return null;

      payload = JSON.parse(json);
    } catch (_) {
      this.log.error(() => 'error parsing content of db-file');
      return null;
    }

    this.log.info(() => 'read db-file');

    return payload;
  }

  private onSave() {
    const { data } = this;

    if (typeof data !== 'object') {
      throw new Error('db-data is not an object!');
    }

    let json;

    try {
      json = JSON.stringify(data);
    } catch (_) {
      this.log.error(() => 'could not JSON-stringify db-data!');
    }

    try {
      write(path, Buffer.from(json || ''), {
        flag: 'w',
      });
    } catch (_) {
      this.log.error(() => 'error writing db-file');
    }

    this.log.info(() => 'written db-file');
  }

  get<T>(key: string): T {
    return getKey<T>(this.data as Record<string, T>, key);
  }

  save(): void {
    this.onSave();
  }
}
