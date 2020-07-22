import { maxNumber, mean, median, minNumber } from '../utils/math.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { sortTimes } from '../utils/time.js';

export type Getter = () => Promise<number>;
export type TimeGetter = () => Date | null;
export type StateGetter = () => number;

export enum Type {
  Mean,
  Median,
  Min,
  Max,
}

export class Aggregate {
  getters: Getter[];

  timeGetters: TimeGetter[];

  stateGetters: StateGetter[];

  aggregator: (results: number[]) => number | null;

  constructor(
    getters: Getter[] = [],
    timeGetters: TimeGetter[] = [],
    stateGetters: StateGetter[] = [],
    type: Type = Type.Mean
  ) {
    this.getters = getters;
    this.timeGetters = timeGetters;
    this.stateGetters = stateGetters;

    this.aggregator = (() => {
      switch (type) {
        case Type.Mean:
          return (results: number[]) => {
            return mean(results);
          };
        case Type.Median:
          return (results: number[]) => {
            return median(results);
          };
        case Type.Min:
          return (results: number[]) => {
            return minNumber(results);
          };
        case Type.Max:
          return (results: number[]) => {
            return maxNumber(results);
          };
        default:
          return () => {
            return null;
          };
      }
    })();

    rebind(this, 'get', 'getTime');
  }

  get(): Promise<number | null> {
    const requests = this.getters.map((getter) => {
      return resolveAlways(getter());
    });

    return Promise.all(requests).then((values) => {
      const results = values.filter((value): value is number => {
        return value !== null;
      });

      if (!results.length) return null;

      return this.aggregator(results);
    });
  }

  getTime(): Date {
    const times = this.timeGetters
      .map((getter) => {
        return getter();
      })
      .filter((value): value is Date => {
        return value !== null;
      });

    // get most recent time
    return sortTimes(...times).slice(-1)[0];
  }

  getState(): number | null {
    const results = this.stateGetters.map((getter) => {
      return getter();
    });

    return this.aggregator(results);
  }
}
