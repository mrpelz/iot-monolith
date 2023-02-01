import { AnyWritableObservable, Observer } from './observable.js';
import { Input, Logger } from './log.js';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { readFile } from 'fs/promises';

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
      } catch {
        this._log.error(() => 'cannot gather values');

        return null;
      }
    })();
    if (!persistValues) return;

    const persistPayload = (() => {
      try {
        return JSON.stringify(persistValues);
      } catch {
        this._log.error(() => 'cannot strigify values');

        return null;
      }
    })();
    if (!persistPayload) return;

    try {
      mkdirSync(dirname(this._path), { recursive: true });
      writeFileSync(this._path, persistPayload);
    } catch (error) {
      this._log.error(() => ({
        body: (error as Error).message,
        stack: (error as Error).stack,
      }));
    }
  }

  async restore(): Promise<void> {
    const restorePayload = await (async () => {
      try {
        return readFile(this._path, { encoding: 'utf8' });
      } catch {
        return null;
      }
    })();
    if (!restorePayload) return;

    const restoreValues = (() => {
      try {
        return JSON.parse(restorePayload) as Record<string, unknown>;
      } catch {
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
