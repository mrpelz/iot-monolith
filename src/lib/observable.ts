import { promiseGuard } from './oop.js';

export type Observer = {
  remove: () => void;
};

export type MetaObserverCallback<T> = (value: T) => void;
export type ObserverCallback<T> = (value: T, observer: Observer) => void;
export type ProxyObserverFn<T, S> = (input: T) => S;

export type AnyObservable<T> =
  | Observable<T>
  | ReadOnlyObservable<T>
  | ProxyObservable<unknown, T>;

export type ObservifyResult<T> = [ReadOnlyObservable<T | null>, () => void];
export type ObservifyGetter<T> = () => Promise<T | null>;

export class Observable<T> {
  protected readonly _observers: Map<MetaObserverCallback<T>, boolean>;

  protected _value: T;

  constructor(initialValue: T, observerCallback?: MetaObserverCallback<T>) {
    this._value = initialValue;
    this._observers = observerCallback
      ? new Map([[observerCallback, false]])
      : new Map();
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    const oldValue = this._value;
    this._value = value;

    for (const [observer, forcedReport] of this._observers) {
      if (value === oldValue && !forcedReport) continue;

      observer(value);
    }
  }

  observe(
    observerCallback: ObserverCallback<T>,
    forcedReport = false
  ): Observer {
    // eslint-disable-next-line prefer-const
    let observer: Observer;

    const metaObserverCallback = (value: T) => {
      observerCallback(value, observer);
    };

    this._observers.set(metaObserverCallback, forcedReport);

    observer = {
      remove: () => this._observers.delete(metaObserverCallback),
    };

    return observer;
  }
}

export class ReadOnlyObservable<T> {
  private readonly _observable: AnyObservable<T>;

  constructor(observable: AnyObservable<T>) {
    this._observable = observable;
  }

  get value(): T {
    return this._observable.value;
  }

  observe(
    observerCallback: ObserverCallback<T>,
    forcedReport = false
  ): Observer {
    return this._observable.observe(observerCallback, forcedReport);
  }
}

export class ProxyObservable<T, S> {
  private readonly _fn: ProxyObserverFn<T, S>;
  private readonly _observable: ReadOnlyObservable<T>;

  constructor(fn: ProxyObserverFn<T, S>, observable: ReadOnlyObservable<T>) {
    this._fn = fn;
    this._observable = observable;
  }

  get value(): S {
    return this._fn(this._observable.value);
  }

  observe(
    observerCallback: ObserverCallback<S>,
    forcedReport = false
  ): Observer {
    return this._observable.observe(
      (value, observer) => observerCallback(this._fn(value), observer),
      forcedReport
    );
  }
}

export function observify<T>(fn: ObservifyGetter<T>): ObservifyResult<T> {
  const observable = new Observable<T | null>(null);
  const trigger = async () => {
    const result = await promiseGuard(fn());
    observable.value = result;
  };

  return [new ReadOnlyObservable(observable), trigger];
}

export function combineObservables<T>(
  fn: (...values: T[]) => T,
  initialValue: T,
  ...states: AnyObservable<T>[]
): ReadOnlyObservable<T> {
  const combined = new Observable<T>(initialValue);
  const result = new ReadOnlyObservable(combined);

  for (const state of states) {
    state.observe(() => {
      const values = states.map(({ value }) => value);

      combined.value = fn(...values);
    });
  }

  return result;
}
