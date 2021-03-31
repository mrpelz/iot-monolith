import {
  MetaObserverCallback,
  Observable,
  Observer,
  ObserverCallback,
} from '../observable/index.js';

export class BooleanState extends Observable<boolean> {
  flip(): boolean {
    this.value = !this.value;

    return this.value;
  }
}

export class EnumState<T> extends Observable<T> {
  private readonly _enum: T[];

  constructor(_enum: T[], initialValue: T) {
    if (!_enum.includes(initialValue)) {
      throw new RangeError(`"${initialValue}" is not an allowed value`);
    }

    super(initialValue);
    this._enum = _enum;
  }

  private get _maxIndex() {
    return this._enum.length - 1;
  }

  private _indexOf(value: T) {
    const index = this._enum.indexOf(value);

    return index === -1 ? null : index;
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    if (value === this._value) return;

    if (!this._enum.includes(value)) {
      throw new RangeError(`"${value}" is not an allowed value`);
    }

    this._value = value;

    for (const observer of this._observers) {
      observer(this._value);
    }
  }

  getIndex(): number | null {
    return this._indexOf(this.value);
  }

  next(): this {
    const currentIndex = this._indexOf(this.value);
    if (currentIndex === null) return this;

    const index = currentIndex === this._maxIndex ? 0 : currentIndex + 1;

    return this.setIndex(index);
  }

  previous(): this {
    const currentIndex = this._indexOf(this.value);
    if (currentIndex === null) return this;

    const index = currentIndex === 0 ? currentIndex - 1 : this._maxIndex;

    return this.setIndex(index);
  }

  setIndex(index: number): this {
    if (index < 0 || index > this._maxIndex) {
      throw new RangeError(`"${index}" is a not existing index`);
    }

    this.value = this._enum[index];

    return this;
  }
}

export class NullState<T = null> {
  protected readonly _observers: Set<MetaObserverCallback<T>>;

  constructor(observerCallback?: MetaObserverCallback<T>) {
    this._observers = observerCallback
      ? new Set([observerCallback])
      : new Set();
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

  trigger(data: T): void {
    for (const observer of this._observers) {
      observer(data);
    }
  }
}

export class ReadOnlyNullState<T> {
  private readonly _nullState: NullState<T>;

  constructor(nullState: NullState<T>) {
    this._nullState = nullState;
  }

  observe(observerCallback: ObserverCallback<T>): Observer {
    return this._nullState.observe(observerCallback);
  }
}
