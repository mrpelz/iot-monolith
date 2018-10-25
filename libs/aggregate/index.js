const { resolveAlways, rebind } = require('../../libs/utils/oop');
const { median } = require('../../libs/utils/math');
const { sortTimes } = require('../../libs/utils/time');

class Aggregate {
  constructor(getters, timeGetters) {
    this.getters = getters;
    this.timeGetters = timeGetters;

    rebind(this, 'get', 'getTime');
  }

  get() {
    const requests = this.getters.map((getter) => {
      return resolveAlways(getter());
    });

    return Promise.all(requests).then((values) => {
      const results = values.filter((value) => {
        return value !== null;
      });

      if (!results.length) return null;

      return median(...results);
    });
  }

  getTime() {
    const times = this.timeGetters.map((getter) => {
      return getter();
    }).filter((value) => {
      return value !== null;
    });

    // get most recent time
    return sortTimes(...times).reverse()[0];
  }
}

module.exports = {
  Aggregate
};
