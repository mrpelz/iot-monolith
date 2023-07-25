import { Event } from '../device/main.js';
import { Observable, ReadOnlyObservable } from '../observable.js';
import { NullState, ReadOnlyNullState } from '../state.js';

export class SingleValueEvent<T = unknown> {
  private readonly _event: Event<T>;
  private readonly _state = new Observable<T | null>(null);

  readonly state: ReadOnlyObservable<T | null>;

  constructor(event: Event<T>) {
    this._event = event;

    this.state = new ReadOnlyObservable(this._state);

    this._event.observable.observe((value) => (this._state.value = value));
  }
}

export class MultiValueEvent<
  T extends Record<string, unknown>,
  K extends keyof T,
> {
  private readonly _event: Event<T>;
  private readonly _properties: K[];
  private readonly _state = {} as { [P in K]: Observable<T[P] | null> };

  readonly state = {} as {
    [P in K]: ReadOnlyObservable<T[P] | null>;
  };

  constructor(event: Event<T>, properties: K[]) {
    this._properties = properties;

    this._event = event;

    for (const property of this._properties) {
      this._state[property] = new Observable(null);
      this.state[property] = new ReadOnlyObservable(this._state[property]);
    }

    this._event.observable.observe((value) => {
      for (const property of this._properties) {
        this._state[property].value = value[property];
      }
    });
  }
}

export class StatelessSingleValueEvent<T = unknown> {
  private readonly _event: Event<T>;
  private readonly _state = new NullState<T | null>();

  readonly state: ReadOnlyNullState<T | null>;

  constructor(event: Event<T>) {
    this._event = event;

    this.state = new ReadOnlyNullState(this._state);

    this._event.observable.observe((value) => {
      if (!value) return;

      this._state.trigger(value);
    });
  }
}

export class StatelessMultiValueEvent<
  T extends Record<string, unknown>,
  K extends keyof T,
> {
  private readonly _event: Event<T>;
  private readonly _properties: K[];
  private readonly _state = {} as { [P in K]: NullState<T[P] | null> };

  readonly state = {} as {
    [P in K]: ReadOnlyNullState<T[P] | null>;
  };

  constructor(event: Event<T>, properties: K[]) {
    this._properties = properties;

    this._event = event;

    for (const property of this._properties) {
      this._state[property] = new NullState();
      this.state[property] = new ReadOnlyNullState(this._state[property]);
    }

    this._event.observable.observe((_value) => {
      for (const property of this._properties) {
        const value = _value[property];
        if (!value) continue;

        this._state[property].trigger(value);
      }
    });
  }
}
