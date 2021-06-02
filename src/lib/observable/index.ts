import { StateGroup } from '../state-group/index.js';
import { promiseGuard } from '../oop/index.js';

export type Observer = {
  remove: () => void;
};

export type MetaObserverCallback<T> = (value: T) => void;
export type ObserverCallback<T> = (value: T, observer: Observer) => void;

export type AnyObservable<T> =
  | Observable<T>
  | ReadOnlyObservable<T>
  | StateGroup<T>;

export type ObservifyResult<T> = [ReadOnlyObservable<T | null>, () => void];
export type ObservifyGetter<T> = () => Promise<T | null>;

export class Observable<T> {
  protected readonly _observers: Set<MetaObserverCallback<T>>;

  protected _value: T;

  constructor(initialValue: T, observerCallback?: MetaObserverCallback<T>) {
    this._value = initialValue;
    this._observers = observerCallback
      ? new Set([observerCallback])
      : new Set();
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    if (value === this._value) return;

    this._value = value;

    for (const observer of this._observers) {
      observer(this._value);
    }
  }

  observe(observerCallback: ObserverCallback<T>): Observer {
    // eslint-disable-next-line prefer-const
    let observer: Observer;

    const metaObserverCallback = (value: T) => {
      observerCallback(value, observer);
    };

    this._observers.add(metaObserverCallback);

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

  observe(observerCallback: ObserverCallback<T>): Observer {
    return this._observable.observe(observerCallback);
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
