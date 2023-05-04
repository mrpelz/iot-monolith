import { AnyWritableObservable, Observer } from './observable.js';
import { Input, Logger, callstack } from './log.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readFile } from 'node:fs/promises';

export class Persistence {
  private readonly _log: Input;
  private readonly _observables = new Map<
    string,
    AnyWritableObservable<unknown>
  >();

  private readonly _path: string;

  constructor(path: string, logger: Logger) {
    this._path = path;

    this._log = logger.getInput({
      head: `${this.constructor.name} "${path}"`,
    });
  }

  observe(
    identifier: string,
    observable: AnyWritableObservable<unknown>
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
          result[identifier] = observable.value;
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
        return readFile(this._path, { encoding: 'utf8' });
      } catch (_error) {
        const error = new Error('cannot restore from file system', {
          cause: _error,
        });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();
    if (!restorePayload) return;

    const restoreValues = (() => {
      try {
        return JSON.parse(restorePayload) as Record<string, unknown>;
      } catch (_error) {
        const error = new Error('cannot JSON-parse values', { cause: _error });

        this._log.error(() => error.message, callstack(error));

        return null;
      }
    })();
    if (!restoreValues) return;

    for (const [identifier, value] of Object.entries(restoreValues)) {
      const observable = this._observables.get(identifier);
      if (!observable) continue;

      observable.value = value;
    }
  }
}
