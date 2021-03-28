export type Observer = {
  remove: () => void;
};

export type ObserverCallback<T> = (value: T) => void;

export class Observable<T> {
  protected _value: T;

  protected readonly _observers: Set<ObserverCallback<T>>;

  constructor(initialValue: T, observer?: ObserverCallback<T>) {
    this._value = initialValue;
    this._observers = new Set(observer ? [observer] : undefined);
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    if (value === this._value) return;

    this._value = value;

    this._observers.forEach((observer) => observer(this._value));
  }

  observe(observer: ObserverCallback<T>): Observer {
    this._observers.add(observer);

    return {
      remove: () => this._observers.delete(observer),
    };
  }
}

export class ReadOnlyObservable<T> {
  private readonly _observable: Observable<T>;

  constructor(observable: Observable<T>) {
    this._observable = observable;
  }

  get value(): T {
    return this._observable.value;
  }

  observe(observer: ObserverCallback<T>): Observer {
    return this._observable.observe(observer);
  }
}
