import { Indicator, IndicatorMode } from '../services/indicator.js';
import { Observable, ReadOnlyObservable } from '../observable.js';
import { BooleanState } from '../state.js';
import { Output as OutputService } from '../services/output.js';

export class Output {
  private readonly _actualState = new Observable<boolean | null>(null);
  private readonly _indicator?: Indicator;
  private readonly _service: OutputService;

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

      this._set(this.setState.value);
    });

    this.actualState = new ReadOnlyObservable(this._actualState);

    this.setState = new BooleanState(false, (on) => this._set(on));
  }

  private async _set(on: boolean) {
    const success = await (async () => {
      try {
        await this._service.request(on);
        return true;
      } catch {
        return false;
      }
    })();

    if (success) {
      this._success(on);
      return;
    }

    this._unknown();
  }

  private _success(on: boolean) {
    this._actualState.value = on;

    if (!this._indicator) return;
    this._indicator.request({
      blink: on ? 3 : 2,
      mode: IndicatorMode.BLINK,
    });
  }

  private _unknown() {
    this._actualState.value = null;
  }
}
