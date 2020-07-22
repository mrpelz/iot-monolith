import { isPromise, rebind } from '../utils/oop.js';

type PromiseResolver<T> = (value: T | PromiseLike<T>) => void;
type PromiseRejector = (reason: Error) => void;

export class Cache<T> {
  time: Date | null;

  timeout: number;

  value: T | null;

  constructor(timeout = 0) {
    this.time = null;
    this.timeout = timeout;
    this.value = null;
  }

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
  private deferred: {
    reject: PromiseRejector;
    resolve: PromiseResolver<T>;
  }[];

  private fulfilled: boolean;

  private promised: Promise<T> | null;

  private timer: NodeJS.Timeout | null;

  private timeout: number;

  requestTime: Date | null;

  resultTime: Date | null;

  value: T | null;

  constructor(timeout = 0) {
    this.deferred = [];
    this.fulfilled = false;
    this.promised = null;
    this.timer = null;
    this.timeout = timeout;
    this.requestTime = null;
    this.resultTime = null;
    this.value = null;

    rebind(this, '_onResolve', '_onReject');
  }

  _onResolve(value: T): void {
    this.fulfilled = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.value = value;
    this.resultTime = new Date();

    this.deferred.forEach(({ resolve }) => {
      resolve(value);
    });
  }

  _onReject(error: Error): void {
    this.fulfilled = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.value = null;
    this.resultTime = null;

    this.deferred.forEach(({ reject }) => {
      reject(error);
    });
  }

  _reTime(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.timer = setTimeout(() => {
      this.value = null;
      this.timer = null;
    }, this.timeout);
  }

  hit(): boolean {
    if (this.requestTime === null) return false;
    if (!this.fulfilled) return true;

    return Boolean(this.timer);
  }

  defer(): Promise<T> {
    const executor = this.fulfilled
      ? (resolve: PromiseResolver<T>, reject: PromiseRejector) => {
          if (!this.promised) return;

          this.promised.then(resolve).catch(reject);
        }
      : (resolve: PromiseResolver<T>, reject: PromiseRejector) => {
          this.deferred.push({
            reject,
            resolve,
          });
        };

    return new Promise(executor);
  }

  promise(promise: Promise<T>, time = new Date()): Promise<T> {
    if (!isPromise(promise)) throw new Error('not a promise');

    this.fulfilled = false;
    this.deferred.length = 0;

    this.requestTime = time;
    this.resultTime = null;
    const result = this.defer();

    promise.then(this._onResolve).catch(this._onReject);

    this.promised = promise;

    this._reTime();

    return result;
  }
}
