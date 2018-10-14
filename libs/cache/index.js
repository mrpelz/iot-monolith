class Cache {
  constructor(timeout = 0) {
    this.timeout = timeout;
    this.time = null;
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

module.exports = {
  Cache
};
