import {
  AnyReadOnlyObservable,
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from './observable.js';
import { BooleanState, NullState } from './state.js';

export class Timer extends NullState {
  private readonly _time: number;
  private _timeout: NodeJS.Timeout | null;
  private readonly _triggerTime = new Observable<number | null>(null);

  readonly isEnabled: BooleanState;
  readonly runoutTime: ReadOnlyProxyObservable<number | null>;

  constructor(time = 0, enableFromStart = true) {
    super();

    this._time = time;

    this.isEnabled = new BooleanState(enableFromStart, (enabled) => {
      if (enabled) return;

      this.stop();
    });

    this.runoutTime = new ReadOnlyProxyObservable(
      this._triggerTime,
      (value) => {
        if (value === null) return null;
        return value + this._time;
      },
    );
  }

  get isActive(): AnyReadOnlyObservable<boolean> {
    return new ReadOnlyProxyObservable(this._triggerTime, Boolean);
  }

  get triggerTime(): AnyReadOnlyObservable<number | null> {
    return new ReadOnlyObservable(this._triggerTime);
  }

  private _handleFire() {
    this.stop();
    this.trigger(null);
  }

  disable(): void {
    this.isEnabled.value = false;
  }

  enable(): void {
    this.isEnabled.value = true;
  }

  start(restart = true): void {
    if (!this.isEnabled.value) return;
    if (this._timeout && !restart) return;

    this.stop();

    this._timeout = setTimeout(() => this._handleFire(), this._time);
    this._triggerTime.value = Date.now();
  }

  stop(): void {
    if (!this._timeout) return;

    clearTimeout(this._timeout);
    this._timeout = null;
    this._triggerTime.value = null;
  }
}
