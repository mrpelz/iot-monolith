export type ObserverCallback<T> = (value: T) => void;

export type Observer = {
  remove: () => void;
};

export class Observable<T> {
  protected _value: T;

  protected readonly observers: Set<ObserverCallback<T>>;

  constructor(initialValue: T, observer?: ObserverCallback<T>) {
    this._value = initialValue;
    this.observers = new Set(observer ? [observer] : undefined);
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    if (value === this._value) return;

    this._value = value;

    this.observers.forEach((observer) => observer(this._value));
  }

  observe(observer: ObserverCallback<T>): Observer {
    this.observers.add(observer);

    return {
      remove: () => this.observers.delete(observer),
    };
  }

  valueOf(): T {
    return this.value;
  }
}
