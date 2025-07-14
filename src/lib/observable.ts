import { promiseGuard } from './promise.js';

export type Observer = {
  remove: () => void;
};

export type MetaObserverCallback<T> = (value: T, changed: boolean) => void;
export type ObserverCallback<T> = (
  value: T,
  observer: Observer,
  changed: boolean,
) => void;
export type ProxyFn<T, S> = (input: T) => S;

export type AnyObservable<T> =
  | Observable<T>
  | ReadOnlyObservable<T>
  | ProxyObservable<unknown, T>
  | ReadOnlyProxyObservable<unknown, T>;

export type AnyWritableObservable<T> =
  | Observable<T>
  | ProxyObservable<unknown, T>;

export type AnyReadOnlyObservable<T> =
  | ReadOnlyObservable<T>
  | ReadOnlyProxyObservable<unknown, T>;

export type ObservifyResult<T> = [ReadOnlyObservable<T | null>, () => void];
export type ObservifyGetter<T> = () => Promise<T | null>;

export class Observable<T> {
  private readonly _observers: Map<MetaObserverCallback<T>, boolean>;
  private _value: T;

  constructor(
    initialValue: T,
    observerCallback?: MetaObserverCallback<T>,
    forcedReport = true,
  ) {
    this._value = initialValue;
    this._observers = observerCallback
      ? new Map([[observerCallback, forcedReport]])
      : new Map();
  }

  get listeners(): number {
    return this._observers.size;
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    const oldValue = this._value;
    this._value = value;

    const changed = this._value !== oldValue;

    for (const [observer, forcedReport] of this._observers) {
      if (!changed && !forcedReport) continue;

      observer(this._value, changed);
    }
  }

  observe(
    observerCallback: ObserverCallback<T>,
    forcedReport = false,
  ): Observer {
    let observer: Observer;

    const metaObserverCallback = (value: T, changed: boolean) => {
      observerCallback(value, observer, changed);
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

  get listeners(): number {
    return this._observable.listeners;
  }

  get value(): T {
    return this._observable.value;
  }

  observe(
    observerCallback: ObserverCallback<T>,
    forcedReport = false,
  ): Observer {
    return this._observable.observe(observerCallback, forcedReport);
  }
}

export class ReadOnlyProxyObservable<T, S = T> {
  private readonly _get: ProxyFn<T, S>;
  private readonly _observable: AnyObservable<T>;

  constructor(observable: AnyObservable<T>, get: ProxyFn<T, S>) {
    this._observable = observable;
    this._get = get;
  }

  get listeners(): number {
    return this._observable.listeners;
  }

  get value(): S {
    return this._get(this._observable.value);
  }

  observe(
    observerCallback: ObserverCallback<S>,
    forcedReport = false,
  ): Observer {
    return this._observable.observe(
      (value, observer, changed) =>
        observerCallback(this._get(value), observer, changed),
      forcedReport,
    );
  }
}

export const isWritableObservable = <T>(
  input: AnyObservable<T>,
): input is AnyWritableObservable<T> => {
  if (input instanceof ReadOnlyObservable) return false;
  if (input instanceof ReadOnlyProxyObservable) return false;

  return true;
};

export class ProxyObservable<T, S = T> {
  static readonly doNotSet = Symbol('doNotSet');

  private readonly _get: ProxyFn<T, S>;
  private readonly _observable: AnyObservable<T>;
  private readonly _set: ProxyFn<S, T | typeof ProxyObservable.doNotSet>;

  private _suspend = false;

  constructor(
    observable: AnyObservable<T>,
    get: ProxyFn<T, S>,
    set: ProxyFn<S, T | typeof ProxyObservable.doNotSet>,
  ) {
    this._observable = observable;
    this._get = get;
    this._set = set;
  }

  get listeners(): number {
    return this._observable.listeners;
  }

  get value(): S {
    return this._get(this._observable.value);
  }

  set value(value: S) {
    if (!isWritableObservable(this._observable)) return;

    this._suspend = true;

    const nextValue = this._set(value);
    if (nextValue !== ProxyObservable.doNotSet) {
      this._observable.value = nextValue;
    }

    this._suspend = false;
  }

  observe(
    observerCallback: ObserverCallback<S>,
    forcedReport = false,
  ): Observer {
    return this._observable.observe((value, observer, changed) => {
      if (this._suspend) return;

      observerCallback(this._get(value), observer, changed);
    }, forcedReport);
  }
}

export class ObservableGroup<T> extends Observable<T> {
  protected readonly _observables: Set<AnyObservable<T>>;

  constructor(initialValue: T, observables: AnyObservable<T>[] = []) {
    super(initialValue);

    this._observables = observables ? new Set(observables) : new Set();

    for (const state of this._observables) {
      state.observe(() => (super.value = this.value), true);
    }
  }

  get observables(): AnyObservable<T>[] {
    return Array.from(this._observables);
  }

  get values(): T[] {
    return this.observables.map(({ value }) => value);
  }

  get value(): T {
    return this._merge();
  }

  set value(value: T) {
    for (const observable of this._observables) {
      if (!isWritableObservable(observable)) {
        continue;
      }

      observable.value = value;
    }

    super.value = value;
  }

  protected _merge(): T {
    throw new Error(`_merge method not defined in ${this}`);
  }
}

export const isObservable = (
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): input is AnyObservable<any> => {
  if (input instanceof Observable) return true;
  if (input instanceof ReadOnlyObservable) return true;
  if (input instanceof ProxyObservable) return true;
  if (input instanceof ReadOnlyProxyObservable) return true;

  return false;
};

export const isReadOnlyObservable = (
  input: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): input is AnyReadOnlyObservable<any> => {
  if (input instanceof ReadOnlyObservable) return true;
  if (input instanceof ReadOnlyProxyObservable) return true;

  return false;
};

// export const makeExtendable = <T>(aClass: Constructor<ObservableGroup<T>>) =>
//   class extends aClass {
//     addObservable(observable: AnyObservable<T>): Observer {
//       this._observables.add(observable);

//       try {
//         super.value = this.value;
//       } catch {
//         // noop
//       }

//       return {
//         remove: () => this._observables.delete(observable),
//       };
//     }
//   };

export const observify = <T>(fn: ObservifyGetter<T>): ObservifyResult<T> => {
  const observable = new Observable<T | null>(null);
  const trigger = async () => {
    const result = await promiseGuard(fn());
    observable.value = result;
  };

  return [new ReadOnlyObservable(observable), trigger];
};
