import { NullState } from '../state/index.js';

export class Timer extends NullState {
  private _enabled = false;
  private readonly _time: number;
  private _timeout: NodeJS.Timeout | null = null;

  constructor(time = 0) {
    super();

    this._time = time;

    this.enable();
  }

  get isRunning(): boolean {
    return Boolean(this._timeout);
  }

  get isEnabled(): boolean {
    return Boolean(this._enabled);
  }

  private _handleFire() {
    this.stop();
    this.trigger(null);
  }

  disable(): void {
    if (!this._enabled) return;

    this.stop();
    this._enabled = false;
  }

  enable(): void {
    this._enabled = true;
  }

  start(restart = true): void {
    if (!this._enabled) return;
    if (this.isRunning && !restart) return;

    this.stop();
    this._timeout = setTimeout(() => this._handleFire(), this._time);
  }

  stop(): void {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
}
