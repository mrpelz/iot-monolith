import { isPromise } from '@mrpelz/misc-utils/promise';

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;
type PromiseRejector = (reason: Error) => void;

export class Cache<T> {
  time: Date | null = null;
  value: T | null = null;

  constructor(public readonly timeout = 0) {}

  hit(): boolean {
    const now = Date.now();

    if (this.time === null) return false;
    if (now > this.time.getTime() + this.timeout) return false;

    return true;
  }

  store(value: T, time = new Date()): void {
    this.time = time;
    this.value = value;
  }
}

export class CachePromise<T> {
  private readonly _deferred: {
    reject: PromiseRejector;
    resolve: PromiseResolver<T>;
  }[];

  private _fulfilled: boolean;
  private _promised: Promise<T> | null;
  private readonly _timeout: number;
  private _timer: NodeJS.Timeout | null;

  requestTime: Date | null;
  resultTime: Date | null;
  value: T | null;

  constructor(timeout = 0) {
    this._deferred = [];
    this._fulfilled = false;
    this._promised = null;
    this._timeout = timeout;
    this._timer = null;
    this.requestTime = null;
    this.resultTime = null;
    this.value = null;
  }

  private _onReject(error: Error): void {
    this._fulfilled = true;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this.value = null;
    this.resultTime = null;

    for (const { reject } of this._deferred) {
      reject(error);
    }
  }

  private _onResolve(value: T): void {
    this._fulfilled = true;

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this.value = value;
    this.resultTime = new Date();

    for (const { resolve } of this._deferred) {
      resolve(value);
    }
  }

  private _reTime(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    this._timer = setTimeout(() => {
      this.value = null;
      this._timer = null;
    }, this._timeout);
  }

  defer(): Promise<T> {
    const executor = this._fulfilled
      ? (resolve: PromiseResolver<T>, reject: PromiseRejector) => {
          if (!this._promised) return;

          this._promised.then(resolve).catch(reject);
        }
      : (resolve: PromiseResolver<T>, reject: PromiseRejector) => {
          this._deferred.push({
            reject,
            resolve,
          });
        };

    return new Promise(executor);
  }

  hit(): boolean {
    if (this.requestTime === null) return false;
    if (!this._fulfilled) return true;

    return Boolean(this._timer);
  }

  promise(promise: Promise<T>, time = new Date()): Promise<T> {
    if (!isPromise(promise)) throw new Error('not a promise');

    this._fulfilled = false;
    this._deferred.length = 0;

    this.requestTime = time;
    this.resultTime = null;
    const result = this.defer();

    promise
      .then((value) => this._onResolve(value))
      .catch((error) => this._onReject(error));

    this._promised = promise;

    this._reTime();

    return result;
  }
}
