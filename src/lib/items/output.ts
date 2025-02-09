import { Observable, ReadOnlyObservable } from '../observable.js';
import { Indicator, IndicatorMode } from '../services/indicator.js';
import { Output as OutputService } from '../services/output.js';
import { BooleanState } from '../state.js';

export class Output {
  private readonly _actualState = new Observable<boolean | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: OutputService;

  readonly $exclude = true as const;

  readonly actualState: ReadOnlyObservable<boolean | null>;
  readonly setState: BooleanState;

  constructor(service: OutputService, indicator?: Indicator) {
    this._indicator = indicator;

    this._service = service;
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
        return;
      }

      this._set(this.setState.value, true);
    });

    this.actualState = new ReadOnlyObservable(this._actualState);

    this.setState = new BooleanState(false, (on) => this._set(on), false);
  }

  private async _set(on: boolean, skipIndicator = false) {
    const success = await (async () => {
      try {
        await this._service.request(on);
        return true;
      } catch {
        return false;
      }
    })();

    if (success) {
      this._success(on, skipIndicator);
      return;
    }

    this._unknown();
  }

  private _success(on: boolean, skipIndicator: boolean) {
    this._actualState.value = on;

    if (!this._indicator || skipIndicator) return;
    this._indicator
      .request({
        blink: on ? 3 : 2,
        mode: IndicatorMode.BLINK,
      })
      .catch(() => {
        // noop
      });
  }

  private _unknown() {
    this._actualState.value = null;
  }
}
