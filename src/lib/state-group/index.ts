import {
  AnyObservable,
  MetaObserverCallback,
  Observer,
  ObserverCallback,
  ReadOnlyObservable,
} from '../observable/index.js';

export class StateGroup<T> {
  private _locked = false;

  protected readonly _children: AnyObservable<T>[];
  protected readonly _observers = new Set<MetaObserverCallback<T>>();

  protected _value: T;

  constructor(...children: AnyObservable<T>[]) {
    this._children = children;

    for (const child of this._children) {
      child.observe((value) => this._forwardObservers(value));
    }
  }

  get value(): T {
    return this._value;
  }

  set value(value: T) {
    this._locked = true;

    for (const child of this._children) {
      if (child instanceof ReadOnlyObservable) continue;
      child.value = value;
    }

    this._locked = false;
    this._forwardObservers(value);
  }

  private _forwardObservers(_: T) {
    if (this._locked) return;

    const value = this.value;

    for (const observer of this._observers) {
      observer(value);
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

export enum BooleanGroupStrategy {
  IS_TRUE_IF_ALL_TRUE,
  IS_TRUE_IF_SOME_TRUE,
}

export class BooleanStateGroup extends StateGroup<boolean> {
  private readonly _strategy: BooleanGroupStrategy;

  constructor(
    strategy: BooleanGroupStrategy,
    ...children: AnyObservable<boolean>[]
  ) {
    super(...children);

    this._strategy = strategy;
  }

  get value(): boolean {
    if (this._strategy === BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE) {
      this.someTrue();
    }

    return this.allTrue();
  }

  allTrue(): boolean {
    for (const child of this._children) {
      if (!child.value) return false;
    }

    return true;
  }

  someTrue(): boolean {
    for (const child of this._children) {
      if (child.value) return true;
    }

    return false;
  }

  values(): boolean[] {
    return this._children.map(({ value }) => value);
  }
}
