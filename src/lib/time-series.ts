import {
  AnyObservable,
  Observable,
  Observer,
  ProxyFn,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import { NullState, ReadOnlyNullState } from '@mrpelz/observable/state';

export enum TimeseriesLimitType {
  ENTRIES,
  TIME,
}

export type TimeseriesLimit =
  | {
      entries: number;
      type: TimeseriesLimitType.ENTRIES;
    }
  | {
      ms: number;
      type: TimeseriesLimitType.TIME;
    };

export class Timeseries<T> {
  private readonly _history = new Map<Date, T>();
  private readonly _updated = new NullState<Map<Date, T>>();
  readonly observer: Observer;
  readonly updated: ReadOnlyNullState<Map<Date, T>>;

  constructor(
    observable: AnyObservable<T>,
    private readonly _limit: TimeseriesLimit,
    observeAll = false,
  ) {
    this.observer = observable.observe(
      (value) => this._handleObservableChange(value),
      observeAll,
    );

    this.updated = new ReadOnlyNullState(this._updated);
    this._handleObservableChange(observable.value);
  }

  get history(): Map<Date, T> {
    return new Map(this._history);
  }

  private _handleCleanup() {
    const timeThreshold =
      this._limit.type === TimeseriesLimitType.TIME
        ? Date.now() - this._limit.ms
        : undefined;

    for (const [date] of this._history) {
      if (
        this._limit.type === TimeseriesLimitType.ENTRIES &&
        this._history.size <= this._limit.entries
      ) {
        break;
      }

      if (timeThreshold && date.getTime() >= timeThreshold) {
        break;
      }

      this._history.delete(date);
    }
  }

  private _handleObservableChange(value: T) {
    this._history.set(new Date(), value);
    this._handleCleanup();

    this._updated.trigger(this.history);
  }
}

export class RollingProduct<T, S> extends ReadOnlyProxyObservable<
  Map<Date, T>,
  S
> {
  constructor(timeseries: Timeseries<T>, get: ProxyFn<Map<Date, T>, S>) {
    const observable = new Observable<Map<Date, T>>(timeseries.history);

    timeseries.updated.observe((history) => (observable.value = history));

    super(observable, get);
  }
}

export class RollingAverage extends RollingProduct<number, number> {
  private static _fn(input: Map<Date, number>): number {
    let sum = 0;
    for (const value of input.values()) {
      sum += value;
    }

    return sum / input.size;
  }

  constructor(timeseries: Timeseries<number>) {
    super(timeseries, RollingAverage._fn);
  }
}

export class RollingMedian extends RollingProduct<number, number> {
  private static _fn(input: Map<Date, number>): number {
    const sorted = Array.from(input.values()).sort((a, b) => a - b);
    const middle = Math.floor(input.size / 2);

    return input.size % 2 === 0
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (sorted[middle - 1]! + sorted[middle]!) / 2
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sorted[middle]!;
  }

  constructor(timeseries: Timeseries<number>) {
    super(timeseries, RollingMedian._fn);
  }
}

export type LinearRegressionResult = {
  intercept: number;
  prediction: Map<Date, number>;
  slope: number;
};

export class RollingLinearRegression extends RollingProduct<
  number,
  LinearRegressionResult | undefined
> {
  private static _fn(predict: number, step: number) {
    return (input: Map<Date, number>): LinearRegressionResult | undefined => {
      if (input.size < 2) return undefined;

      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumXX = 0;

      for (const [date, y] of input) {
        const x = date.getTime();

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
      }

      const denominator = input.size * sumXX - sumX * sumX;
      if (!denominator) return undefined;

      const slope = (input.size * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / input.size;

      const now = Date.now();
      const prediction = new Map<Date, number>();

      for (let index = 0; index < predict; index += 1) {
        const x = now + step * (index + 1);

        const date = new Date();
        date.setTime(x);

        prediction.set(date, slope * x + intercept);
      }

      return {
        intercept,
        prediction,
        slope,
      };
    };
  }

  constructor(timeseries: Timeseries<number>, predict = 10, step = 5000) {
    super(timeseries, RollingLinearRegression._fn(predict, step));
  }
}
