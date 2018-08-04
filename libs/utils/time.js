class Cache {
  constructor(time, exec, ...args) {
    this._time = time;
    this._last = 0;
    this._value = null;
    this._exec = exec;
    this._args = args;
  }

  hit() {
    return new Promise((resolve, reject) => {
      if (
        (this._last + this._time) < Date.now()
        || this._value === null
      ) {
        this._exec(...this._args).then((value) => {
          this._last = Date.now();

          this._value = value;
          return value;
        }).catch((reason) => {
          reject(reason);
        });
      } else {
        resolve(this._value);
      }
    });
  }
}

function sleep(time, data) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, time);
  });
}

module.exports = {
  Cache,
  sleep
};
