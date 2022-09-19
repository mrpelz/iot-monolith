import { Indicator, IndicatorMode } from '../services/indicator.js';
import { Observable, ReadOnlyObservable } from '../observable.js';
import { BooleanState } from '../state.js';
import { Output as OutputService } from '../services/output.js';
import { Timer } from '../timer.js';

export class Output {
  private readonly _actualState = new Observable<boolean | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: OutputService;
  private readonly _timer = new Timer(10000);

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

    this._timer.observe(() => this._set(this.setState.value));
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

    this._timer.stop();

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

    this._timer.start();
  }
}
