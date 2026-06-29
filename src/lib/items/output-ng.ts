import { safeAsync } from '@mrpelz/misc-utils/async';
import { Observable, ReadOnlyObservable } from '@mrpelz/observable';
import { BooleanState } from '@mrpelz/observable/state';

import {
  blink as blinkBinary,
  OutputBinary as OutputBinaryService,
} from '../services/output-ng-binary.js';
import {
  blink as blinkDimmable,
  OutputDimmable as OutputDimmableService,
} from '../services/output-ng-dimmable.js';

export type OutputNgIndicatorService =
  | OutputBinaryService
  | OutputDimmableService;

export class OutputNgBinary {
  private readonly _actualState = new Observable<boolean | null>(null);

  readonly $exclude = true as const;

  readonly actualState: ReadOnlyObservable<boolean | null>;
  readonly setState: BooleanState;

  constructor(
    private readonly _service: OutputBinaryService,
    private readonly _indicator?: OutputNgIndicatorService,
  ) {
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
    const [error] = await safeAsync(
      this._service.request({
        iterations: 1,
        sequence: [{ holdTime: 0, value: on }],
      }),
    );

    if (error) {
      this._unknown();
      return;
    }

    await this._success(on, skipIndicator);
  }

  private async _success(on: boolean, skipIndicator: boolean) {
    this._actualState.value = on;

    if (!this._indicator || skipIndicator) return;
    const blinkCount = on ? 3 : 2;

    await safeAsync(
      this._indicator instanceof OutputBinaryService
        ? this._indicator.request(blinkBinary(blinkCount))
        : this._indicator.request(blinkDimmable(blinkCount)),
    );
  }

  private _unknown() {
    this._actualState.value = null;
  }
}
