import { maxNumber, mean, median, minNumber } from '../utils/math.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { sortTimes } from '../utils/time.js';

export class Aggregate {
  constructor(getters = [], timeGetters = [], stateGetters = [], type = 'mean') {
    if (!type || !['mean', 'median', 'min', 'max'].includes(type)) {
      throw new Error('illegal type');
    }

    this.getters = getters;
    this.timeGetters = timeGetters;
    this.stateGetters = stateGetters;

    this.aggregator = (() => {
      switch (type) {
        case 'mean':
          return (results) => { return mean(results); };
        case 'median':
          return (results) => { return median(results); };
        case 'min':
          return (results) => { return minNumber(results); };
        case 'max':
          return (results) => { return maxNumber(results); };
        default:
          return () => { return null; };
      }
    })();

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

      return this.aggregator(results);
    });
  }

  getTime() {
    const times = this.timeGetters.map((getter) => {
      return getter();
    }).filter((value) => {
      return value !== null;
    });

    // get most recent time
    return sortTimes(...times).slice(-1)[0];
  }

  getState() {
    const results = this.stateGetters.map((getter) => {
      return getter();
    });

    return this.aggregator(results);
  }
}
