import { Indicator, IndicatorMode } from '../../services/indicator/index.js';
import { Observable, ReadOnlyObservable } from '../../observable/index.js';
import { BooleanState } from '../../state/index.js';
import { Output as OutputService } from '../../services/output/index.js';

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
    try {
      await this._service.request(on);
      this._success(on);
    } catch {
      this._unknown();
    }
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
