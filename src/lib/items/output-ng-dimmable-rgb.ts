/* eslint-disable no-nested-ternary */
/* eslint-disable unicorn/no-nested-ternary */
import { safeAsync } from '@mrpelz/misc-utils/async';
import { Observable, ReadOnlyObservable } from '@mrpelz/observable';
import { EnumState } from '@mrpelz/observable/state';

import { TOutputProgress as OutputNgProgressEvent } from '../events/output-ng-progress.js';
import { ITERATE_INFINITE } from '../services/output-ng-binary.js';
import {
  blink,
  isRGB,
  OutputDimmableRGB as OutputDimmableRGBService,
  OutputDimmableRGBRequest,
  RGB,
  setRGB,
} from '../services/output-ng-dimmable-rgb.js';
import {
  AnimationState,
  OutputIndicator,
  universalIndicatorBlink,
} from './output-ng-binary.js';

export class OutputDimmableRGB {
  private readonly _actualState = new Observable<RGB | null>(null);
  private readonly _animationState = new EnumState(AnimationState, 'STATIC');

  private _isSequenceRequestInProgress = false;

  readonly $exclude = true as const;

  readonly actualState = new ReadOnlyObservable(this._actualState);

  readonly animationState = new ReadOnlyObservable(this._animationState);

  readonly setState: Observable<RGB>;

  constructor(
    private readonly _service: OutputDimmableRGBService,
    private readonly _progressEvent: OutputNgProgressEvent,
    private readonly _indicator?: OutputIndicator,
  ) {
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
        return;
      }

      this._set(this.setState.value, true);
    });

    this._progressEvent.observable.observe(({ isIterating }) => {
      if (isIterating) return;
      this._animationState.value = 'STATIC';
    });

    this.setState = new Observable({ b: 0, g: 0, r: 0 }, (value) =>
      this._set(value),
    );
  }

  private async _set(
    value: RGB | OutputDimmableRGBRequest,
    skipIndicator = false,
  ) {
    if (this._isSequenceRequestInProgress) return;
    this._isSequenceRequestInProgress = true;

    const request = isRGB(value) ? setRGB(value) : value;

    const { b, g, r } = request.sequence.at(-1)?.value ?? {};
    if (r === undefined || g === undefined || b === undefined) {
      this._isSequenceRequestInProgress = false;
      return;
    }

    this.setState.value = { b, g, r };
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
    this._actualState.value = this.setState.value;

    if (!this._indicator || skipIndicator) return;
    const blinkCount = this._actualState.value ? 3 : 2;

    await safeAsync(universalIndicatorBlink(this._indicator, blinkCount));
  }

  private _unknown() {
    this._actualState.value = null;
    this._animationState.value = 'STATIC';
  }

  async blink(count?: number): Promise<void> {
    await this.set(blink(count));
  }

  async set(value: OutputDimmableRGBRequest): Promise<void> {
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
