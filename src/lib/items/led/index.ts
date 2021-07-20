import { Indicator, IndicatorMode } from '../../services/indicator/index.js';
import { Observable, ReadOnlyObservable } from '../../observable/index.js';
import { EnumState } from '../../state/index.js';
import { Led as LedService } from '../../services/led/index.js';

const states = [true, false, null] as const;

export class Led {
  private readonly _actualBrightness = new Observable<number | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: LedService;

  readonly actualBrightness: ReadOnlyObservable<number | null>;
  readonly actualOn: ReadOnlyObservable<typeof states[number]>;
  readonly setBrightness: Observable<number>;

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

    const actualOn = new EnumState(states, null);
    this._actualBrightness.observe((brightness) => {
      actualOn.value = brightness === null ? null : Boolean(brightness);
    });

    this.actualBrightness = new ReadOnlyObservable(this._actualBrightness);
    this.actualOn = new ReadOnlyObservable(actualOn);

    this.setBrightness = new Observable(0, (brightness) =>
      this._set(brightness)
    );
  }

  private async _set(brightness: number) {
    try {
      await this._service.request(brightness);
      this._success(brightness);
    } catch {
      this._unknown();
    }
  }

  private _success(brightness: number) {
    this._actualBrightness.value = brightness;

    if (!this._indicator) return;
    this._indicator.request({
      blink: brightness ? 3 : 2,
      mode: IndicatorMode.BLINK,
    });
  }

  private _unknown() {
    this._actualBrightness.value = null;
  }
}
