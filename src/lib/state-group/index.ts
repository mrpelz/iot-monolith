import {
  AnyObservable,
  MetaObserverCallback,
  Observer,
  ObserverCallback,
  ReadOnlyObservable,
} from '../observable/index.js';

export class StateGroup<T> {
  private _locked: AnyObservable<T> | null = null;

  protected readonly _children: AnyObservable<T>[];
  protected readonly _observers = new Set<MetaObserverCallback<T>>();

  constructor(...children: AnyObservable<T>[]) {
    this._children = children;

    for (const child of this._children) {
      child.observe((value) => {
        if (this._locked) return;
        this._locked = child;

        this.value = value;

        this._locked = null;
      });
    }
  }

  get value(): T {
    const result = new Set<T>();

    for (const child of this._children) {
      result.add(child.value);
    }

    if (result.size !== 1) {
      throw new Error('StateGroup failed to reconcile member values');
    }

    return [...result][0];
  }

  set value(value: T) {
    for (const child of this._children) {
      if (this._locked === child || child instanceof ReadOnlyObservable) {
        continue;
      }

      child.value = value;
    }

    for (const observer of this._observers) {
      observer(this.value);
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

  set value(value: boolean) {
    super.value = value;
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
