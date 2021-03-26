import { Observable, Observer, ObserverCallback } from '../observable/index.js';

export class BooleanState extends Observable<boolean> {
  flip(): boolean {
    this.value = !this.value;

    return this.value;
  }
}

export class EnumState<T> extends Observable<T> {
  private _enum: T[];

  constructor(_enum: T[], initialValue: T) {
    if (!_enum.includes(initialValue)) {
      throw new RangeError(`"${initialValue}" is not an allowed value`);
    }

    super(initialValue);
    this._enum = _enum;
  }

  private get maxIndex() {
    return this._enum.length - 1;
  }

  private indexOf(value: T) {
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

    this.observers.forEach((observer) => observer(this._value));
  }

  getIndex(): number | null {
    return this.indexOf(this.value);
  }

  next(): this {
    const currentIndex = this.indexOf(this.value);
    if (currentIndex === null) return this;

    const index = currentIndex === this.maxIndex ? 0 : currentIndex + 1;

    return this.setIndex(index);
  }

  previous(): this {
    const currentIndex = this.indexOf(this.value);
    if (currentIndex === null) return this;

    const index = currentIndex === 0 ? currentIndex - 1 : this.maxIndex;

    return this.setIndex(index);
  }

  setIndex(index: number): this {
    if (index < 0 || index > this.maxIndex) {
      throw new RangeError(`"${index}" is a not existing index`);
    }

    this.value = this._enum[index];

    return this;
  }
}

export class NullState<T = null> {
  protected readonly observers: Set<ObserverCallback<T>>;

  constructor(observer?: ObserverCallback<T>) {
    this.observers = new Set(observer ? [observer] : undefined);
  }

  observe(observer: ObserverCallback<T>): Observer {
    this.observers.add(observer);

    return {
      remove: () => this.observers.delete(observer),
    };
  }

  trigger(data: T): void {
    this.observers.forEach((observer) => observer(data));
  }
}
