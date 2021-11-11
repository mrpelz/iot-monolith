import { Indicator, IndicatorMode } from '../services/indicator.js';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../observable.js';
import { BooleanProxyState } from '../state.js';
import { Led as LedService } from '../services/led.js';
import { Timer } from '../timer.js';

export class Led {
  private readonly _actualBrightness = new Observable<number | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: LedService;
  private readonly _timer = new Timer(10000);

  readonly actualBrightness: ReadOnlyObservable<number | null>;
  readonly actualOn: ReadOnlyProxyObservable<number | null, boolean | null>;
  readonly setBrightness: Observable<number>;
  readonly setOn: BooleanProxyState<number>;

  constructor(service: LedService, indicator?: Indicator) {
    this._indicator = indicator;

    this._service = service;
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
        return;
      }

      this._set(this.setBrightness.value);
    });

    this.actualBrightness = new ReadOnlyObservable(this._actualBrightness);
    this.actualOn = new ReadOnlyProxyObservable(
      this._actualBrightness,
      (value) => (value === null ? value : Boolean(value))
    );

    this.setBrightness = new Observable(
      0,
      (brightness) => this._set(brightness),
      false
    );
    this.setOn = new BooleanProxyState(
      this.setBrightness,
      (value) => Boolean(value),
      (value) => (value ? 255 : 0)
    );

    this._timer.observe(() => this._set(this.setBrightness.value));
  }

  private async _set(brightness: number) {
    const success = await (async () => {
      try {
        await this._service.request(brightness);
        return true;
      } catch {
        return false;
      }
    })();

    if (success) {
      this._success(brightness);
      return;
    }

    this._unknown();
  }

  private _success(brightness: number) {
    this._actualBrightness.value = brightness;

    this._timer.stop();

    if (!this._indicator) return;
    this._indicator
      .request({
        blink: brightness ? 3 : 2,
        mode: IndicatorMode.BLINK,
      })
      .catch(() => {
        // noop
      });
  }

  private _unknown() {
    this._actualBrightness.value = null;

    this._timer.start();
  }
}
