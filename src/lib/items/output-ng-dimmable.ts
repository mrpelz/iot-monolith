/* eslint-disable no-nested-ternary */
/* eslint-disable unicorn/no-nested-ternary */
import { safeAsync } from '@mrpelz/misc-utils/async';
import { isPlainObject } from '@mrpelz/misc-utils/oop';
import {
  Observable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '@mrpelz/observable';
import { BooleanProxyState, EnumState } from '@mrpelz/observable/state';

import { TOutputProgress as OutputNgProgressEvent } from '../events/output-ng-progress.js';
import { ITERATE_INFINITE } from '../services/output-ng-binary.js';
import {
  blink,
  off,
  on,
  OutputDimmable as OutputDimmableService,
  OutputDimmableRequest,
} from '../services/output-ng-dimmable.js';
import {
  AnimationState,
  OutputIndicator,
  universalIndicatorBlink,
} from './output-ng-binary.js';

export const coerceActualBrightnessToOn = (
  value: number | null,
): boolean | null => {
  if (value === null) return null;
  return Boolean(value);
};

export const coerceSetOnToBrightness = (value: boolean): number =>
  value ? 1 : 0;

export class OutputDimmable {
  private readonly _actualBrightness = new Observable<number | null>(null);
  private readonly _animationState = new EnumState(AnimationState, 'STATIC');

  private _isSequenceRequestInProgress = false;

  readonly $exclude = true as const;

  readonly actualBrightness = new ReadOnlyObservable(this._actualBrightness);
  readonly actualOn = new ReadOnlyProxyObservable(
    this._actualBrightness,
    coerceActualBrightnessToOn,
  );

  readonly animationState = new ReadOnlyObservable(this._animationState);

  readonly setBrightness: Observable<number>;
  readonly setOn: BooleanProxyState<number>;

  constructor(
    private readonly _service: OutputDimmableService,
    private readonly _progressEvent: OutputNgProgressEvent,
    private readonly _indicator?: OutputIndicator,
  ) {
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
        return;
      }

      this._set(this.setBrightness.value, true);
    });

    this._progressEvent.observable.observe(({ isIterating }) => {
      if (isIterating) return;
      this._animationState.value = 'STATIC';
    });

    this.setBrightness = new Observable(0, (value) => this._set(value));
    this.setOn = new BooleanProxyState(
      this.setBrightness,
      Boolean,
      coerceSetOnToBrightness,
    );
  }

  private async _set(
    value: number | OutputDimmableRequest,
    skipIndicator = false,
  ) {
    if (this._isSequenceRequestInProgress) return;
    this._isSequenceRequestInProgress = true;

    const request = isPlainObject(value) ? value : value ? on() : off();

    const endState = request.sequence.at(-1)?.value.value;
    if (endState === undefined) {
      this._isSequenceRequestInProgress = false;
      return;
    }

    this.setBrightness.value = endState;
    this._isSequenceRequestInProgress = false;

    this._animationState.value =
      request.iterations === ITERATE_INFINITE
        ? 'INFINITE'
        : this._progressEvent
          ? 'FINITE'
          : 'STATIC';

    const [error] = await safeAsync(this._service.request(request));

    if (error) {
      this._unknown();
      return;
    }

    await this._success(skipIndicator);
  }

  private async _success(skipIndicator: boolean) {
    this._actualBrightness.value = this.setBrightness.value;

    if (!this._indicator || skipIndicator) return;
    const blinkCount = this._actualBrightness.value ? 3 : 2;

    await safeAsync(universalIndicatorBlink(this._indicator, blinkCount));
  }

  private _unknown() {
    this._actualBrightness.value = null;
    this._animationState.value = 'STATIC';
  }

  async blink(count?: number): Promise<void> {
    await this.set(blink(count));
  }

  async set(value: OutputDimmableRequest): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();

    this._animationState.observe((animationState, observer) => {
      if (animationState !== 'STATIC') return;

      resolve();
      observer.remove();
    }, true);

    await this._set(value);

    return promise;
  }
}
