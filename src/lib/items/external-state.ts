import { safeAsync } from '@mrpelz/misc-utils/async';
import { rebind } from '@mrpelz/misc-utils/oop';
import { Observable, ReadOnlyObservable } from '@mrpelz/observable';

import { Schedule } from '../schedule.js';

export class ExternalState<T> {
  protected readonly _actualState = new Observable<T | null>(null);

  readonly $exclude = true as const;
  readonly actualState = new ReadOnlyObservable(this._actualState);

  inject(value: T | null): void {
    this._actualState.set(value);
  }
}

export class ExternalStateSettable<T> extends ExternalState<T> {
  private _isInProgressSetter = false;

  readonly setState: Observable<T>;

  constructor(
    initialValue: T,
    private readonly _setter: (
      value: T,
      actualValue: T | null,
    ) => Promise<void>,
    schedule?: Schedule,
  ) {
    super();

    rebind(this, '_refreshSetState');
    rebind(this, 'reassert');

    this.setState = new Observable(initialValue, this.reassert);
    schedule?.addTask(this.reassert);

    this._actualState.observe(this._refreshSetState);
  }

  private _refreshSetState(value: T | null) {
    if (value === null) return;

    this._isInProgressSetter = true;
    this.setState.set(value);
    this._isInProgressSetter = false;
  }

  async reassert(): Promise<void> {
    if (this._isInProgressSetter) return;
    this._isInProgressSetter = true;

    await safeAsync(this._setter(this.setState.value, this._actualState.value));

    this._isInProgressSetter = false;
  }
}

export class ExternalStateScheduled<T> extends ExternalState<T> {
  static readonly doNotSet = Symbol('ExternalStateScheduled.doNotSet');

  private _isInProgress = false;

  constructor(
    private readonly _getter: () => Promise<
      T | null | typeof ExternalStateSettableScheduled.doNotSet
    >,
    schedule?: Schedule,
  ) {
    super();

    rebind(this, 'reevaluate');
    schedule?.addTask(this.reevaluate);
  }

  async reevaluate(): Promise<void> {
    if (this._isInProgress) return;
    this._isInProgress = true;

    const [error, nextValue] = await safeAsync(this._getter());

    if (nextValue !== ExternalStateScheduled.doNotSet) {
      this._actualState.set(error ? null : nextValue);
    }

    this._isInProgress = false;
  }
}

export class ExternalStateSettableScheduled<
  T,
> extends ExternalStateScheduled<T> {
  private _isInProgressSetter = false;

  readonly setState: Observable<T>;

  constructor(
    initialValue: T,
    _getter: () => Promise<
      T | null | typeof ExternalStateSettableScheduled.doNotSet
    >,
    private readonly _setter: (
      value: T,
      actualValue: T | null,
    ) => Promise<void>,
    schedule?: Schedule,
    scheduleReassertSetter?: Schedule,
  ) {
    super(_getter, schedule);

    rebind(this, '_refreshSetState');
    rebind(this, 'reassert');

    this.setState = new Observable(initialValue, this.reassert);
    scheduleReassertSetter?.addTask(this.reassert);

    this._actualState.observe(this._refreshSetState);
  }

  private _refreshSetState(value: T | null) {
    if (value === null) return;

    this._isInProgressSetter = true;
    this.setState.set(value);
    this._isInProgressSetter = false;
  }

  async reassert(): Promise<void> {
    if (this._isInProgressSetter) return;
    this._isInProgressSetter = true;

    await safeAsync(this._setter(this.setState.value, this._actualState.value));

    this._isInProgressSetter = false;
  }
}
