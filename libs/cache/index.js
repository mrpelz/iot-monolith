const { isPromise, rebind } = require('../utils/oop');

class Cache {
  constructor(timeout = 0) {
    this.time = null;
    this.timeout = timeout;
    this.value = null;
  }

  hit() {
    const now = Date.now();

    if (this.time === null) return false;
    if (now > (this.time.getTime() + this.timeout)) return false;

    return true;
  }

  store(value, time = new Date()) {
    this.time = time;
    this.value = value;
  }
}

class CachePromise {
  constructor(timeout = 0) {
    this._deferred = [];
    this._fulfilled = false;
    this._promised = null;
    this._timeout = timeout;
    this.requestTime = null;
    this.resultTime = null;
    this.value = null;

    rebind(this, '_onResolve', '_onReject');
  }

  _onResolve(value) {
    this._fulfilled = true;

    this.value = value;
    this.resultTime = new Date();

    this._deferred.forEach(({ resolve }) => {
      resolve(value);
    });
  }

  _onReject(error) {
    this._fulfilled = true;

    this.value = null;
    this.resultTime = null;

    this._deferred.forEach(({ reject }) => {
      reject(error);
    });
  }

  hit() {
    const now = Date.now();

    if (this.requestTime === null) return false;
    if (!this._fulfilled) return true;
    if (now > (this.requestTime.getTime() + this._timeout)) return false;

    return true;
  }

  defer() {
    const executor = this._fulfilled
      ? (resolve, reject) => {
        this._promised
          .then(resolve)
          .catch(reject);
      }
      : (resolve, reject) => {
        this._deferred.push({
          resolve,
          reject
        });
      };

    return new Promise(executor);
  }

  promise(promise, time = new Date()) {
    if (!isPromise(promise)) throw new Error('not a promise');

    this._fulfilled = false;
    this._deferred.length = 0;

    this.requestTime = time;
    this.resultTime = null;
    const result = this.defer();

    promise
      .then(this._onResolve)
      .catch(this._onReject);

    this._promised = promise;

    return result;
  }
}

module.exports = {
  Cache,
  CachePromise
};
