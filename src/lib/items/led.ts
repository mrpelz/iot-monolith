import { gammaCorrect, maxmin } from '@mrpelz/misc-utils/number';
import {
  Observable,
  ProxyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import { BooleanProxyState } from '@mrpelz/observable/state';

import { Indicator, IndicatorMode } from '../services/indicator.js';
import { Led as LedService } from '../services/led.js';

const MAX_DUTY_CYCLE = 255;

export class Led {
  private readonly _actualBrightness = new Observable<number | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: LedService;
  private readonly _setBrightness = new Observable(0);

  readonly $exclude = true as const;

  readonly actualBrightness: ReadOnlyProxyObservable<number | null>;
  readonly actualOn: ReadOnlyProxyObservable<number | null, boolean | null>;
  readonly setBrightness: ProxyObservable<number>;
  readonly setOn: BooleanProxyState<number>;

  constructor(service: LedService, indicator?: Indicator) {
    this._indicator = indicator;

    this._service = service;
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
        return;
      }

      this._set(this._setBrightness.value, true);
    });

    this.actualBrightness = new ReadOnlyProxyObservable(
      this._actualBrightness,
      (value) => (value === null ? null : value / MAX_DUTY_CYCLE),
    );
    this.actualOn = new ReadOnlyProxyObservable(
      this._actualBrightness,
      (value) => (value === null ? value : Boolean(value)),
    );

    this.setBrightness = new ProxyObservable(
      this._setBrightness,
      (value) => value / MAX_DUTY_CYCLE,
      (value) => maxmin(value) * MAX_DUTY_CYCLE,
    );
    this.setOn = new BooleanProxyState(
      this._setBrightness,
      (value) => Boolean(value),
      (value) => (value ? MAX_DUTY_CYCLE : 0),
    );

    this._setBrightness.observe((brightness) => this._set(brightness));
  }

  private async _set(brightness: number, skipIndicator = false) {
    const success = await (async () => {
      try {
        await this._service.request(gammaCorrect(brightness, MAX_DUTY_CYCLE));
        return true;
      } catch {
        return false;
      }
    })();

    if (success) {
      this._success(brightness, skipIndicator);
      return;
    }

    this._unknown();
  }

  private _success(brightness: number, skipIndicator: boolean) {
    this._actualBrightness.value = brightness;

    if (!this._indicator || skipIndicator) return;
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
  }
}
