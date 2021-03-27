import { Observable, Observer, ObserverCallback } from '../observable/index.js';

export class StateGroup<T> {
  protected _value: T;

  protected readonly _children: Observable<T>[];

  constructor(...children: Observable<T>[]) {
    this._children = children;
  }

  get value(): T {
    return this._value;
  }

  observe(observer: ObserverCallback<T>): Observer {
    const observers: Observer[] = [];

    for (const child of this._children) {
      observers.push(child.observe(observer));
    }

    return {
      remove: () => {
        for (const _observer of observers) {
          _observer.remove();
        }
      },
    };
  }

  valueOf(): T {
    return this.value;
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
    ...children: Observable<boolean>[]
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
