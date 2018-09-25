const { resolveAlways, rebind } = require('../../libs/utils/oop');
const { median } = require('../../libs/utils/math');

class Aggregate {
  constructor(metric, instances) {
    this.getters = instances.map((instance) => {
      return instance.access('get', metric);
    });

    rebind(this, 'get');
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
}

module.exports = {
  Aggregate
};
