import {
  AnyObservable,
  AnyObservableOrNullState,
  Observable,
  Observer,
  ProxyFn,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';

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
  private readonly _history = new Observable(new Map<Date, T>());
  readonly history: ReadOnlyObservable<Map<Date, T>>;
  readonly observer: Observer;

  constructor(
    observable: AnyObservable<T | null>,
    private readonly _limit: TimeseriesLimit,
    observeAll = false,
  ) {
    this.observer = observable.observe(
      (value, _observer, _changed, origin) =>
        this._handleObservableChange(value, origin),
      observeAll,
    );

    this.history = new ReadOnlyObservable(this._history);
    this._handleObservableChange(observable.value, observable);
  }

  private _handleCleanup(history: Map<Date, T>) {
    const timeThreshold =
      this._limit.type === TimeseriesLimitType.TIME
        ? Date.now() - this._limit.ms
        : undefined;

    for (const [date] of history) {
      if (
        this._limit.type === TimeseriesLimitType.ENTRIES &&
        this._history.value.size <= this._limit.entries
      ) {
        break;
      }

      if (timeThreshold && date.getTime() >= timeThreshold) {
        break;
      }

      history.delete(date);
    }
  }

  private _handleObservableChange(
    value: T | null,
    origin: AnyObservableOrNullState<T>,
  ) {
    if (value === null) return;

    const history = this._history.value;
    history.set(new Date(), value);

    this._handleCleanup(history);

    this._history.set(new Map(history), origin);
  }
}

export class RollingProduct<T, S> extends ReadOnlyProxyObservable<
  Map<Date, T>,
  S
> {
  constructor(timeseries: Timeseries<T>, get: ProxyFn<Map<Date, T>, S>) {
    super(timeseries.history, get);
  }
}

export class RollingMean extends RollingProduct<number, number> {
  private static _fn(input: Map<Date, number>): number {
    let sum = 0;
    for (const value of input.values()) {
      sum += value;
    }

    return sum / input.size;
  }

  constructor(timeseries: Timeseries<number>) {
    super(timeseries, RollingMean._fn);
  }
}

export class RollingMedian extends RollingProduct<number, number> {
  private static _fn(input: Map<Date, number>): number {
    const sorted = Array.from(input.values()).toSorted((a, b) => a - b);
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

  constructor(timeseries: Timeseries<number>, predict = 720, step = 5000) {
    super(timeseries, RollingLinearRegression._fn(predict, step));
  }
}
