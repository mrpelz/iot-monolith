import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import nodePath from 'node:path';

const { dirname } = nodePath;

import { jsonParseGuarded } from '@mrpelz/misc-utils';
import { AnyWritableObservable, Observer } from '@mrpelz/observable';

import { callstack, Input, Logger } from './log.js';
import { Schedule } from './schedule.js';

export class Persistence {
  private readonly _log: Input;
  private readonly _observables = new Map<
    string,
    AnyWritableObservable<unknown>
  >();

  private readonly _path: string;

  constructor(path: string, schedule: Schedule, logger: Logger) {
    this._path = path;

    this._log = logger.getInput({
      head: `${this.constructor.name} "${path}"`,
    });

    schedule.addTask(() => this.persist());
  }

  observe(
    identifier: string,
    observable: AnyWritableObservable<unknown>,
  ): Observer {
    if (this._observables.has(identifier)) {
      throw new Error(`identifier "${identifier}" already in use`);
    }

    this._observables.set(identifier, observable);

    return {
      remove: () => this._observables.delete(identifier),
    };
  }

  persist(): void {
    const persistValues = (() => {
      try {
        const result = {} as Record<string, unknown>;

        for (const [identifier, observable] of this._observables.entries()) {
          const value = observable.value;

          this._log.info(
            () =>
              `persisting "${identifier}" with value ${JSON.stringify(value)}`,
          );

          result[identifier] = value;
        }

        return result;
      } catch (_error) {
        const error = new Error('cannot gather values', { cause: _error });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();
    if (!persistValues) return;

    const persistPayload = (() => {
      try {
        return JSON.stringify(persistValues);
      } catch (_error) {
        const error = new Error('cannot JSON-strigify values', {
          cause: _error,
        });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();
    if (!persistPayload) return;

    try {
      mkdirSync(dirname(this._path), { recursive: true });
      writeFileSync(this._path, persistPayload);
    } catch (_error) {
      const error = new Error('cannot persist on file system', {
        cause: _error,
      });

      this._log.error(() => error.message, callstack(error));
    }
  }

  async restore(): Promise<void> {
    const restorePayload = await (async () => {
      try {
        mkdirSync(dirname(this._path), { recursive: true });
        return readFile(this._path, { encoding: 'utf8', flag: 'as+' });
      } catch (_error) {
        const error = new Error('cannot restore from file system', {
          cause: _error,
        });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();
    if (!restorePayload) return;

    const restoreValues =
      jsonParseGuarded<Record<string, unknown>>(restorePayload);
    if (restoreValues instanceof Error) {
      this._log.error(() => restoreValues.message, callstack(restoreValues));

      return;
    }

    for (const [identifier, value] of Object.entries(restoreValues)) {
      this._log.info(
        () => `restoring "${identifier}" to value ${JSON.stringify(value)}`,
      );

      const observable = this._observables.get(identifier);
      if (!observable) continue;

      observable.value = value;
    }
  }
}
