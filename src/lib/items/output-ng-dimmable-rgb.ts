/* eslint-disable no-nested-ternary */
/* eslint-disable unicorn/no-nested-ternary */
import { safeAsync } from '@mrpelz/misc-utils/async';
import {
  Observable,
  ProxyObservable,
  ReadOnlyObservable,
} from '@mrpelz/observable';
import { EnumState } from '@mrpelz/observable/state';

import { TOutputProgress as OutputNgProgressEvent } from '../events/output-ng-progress.js';
import { ITERATE_INFINITE } from '../services/output-ng-binary.js';
import {
  blink,
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
  private readonly _setState: Observable<RGB | null>;

  readonly $exclude = true as const;

  readonly actualState = new ReadOnlyObservable(this._actualState);
  readonly animationState = new ReadOnlyObservable(this._animationState);
  readonly customRampTime = new Observable<number | null>(null);
  readonly setState: ProxyObservable<RGB | null, RGB>;

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

      this._setFromRGB(this.setState.value, true);
    });

    this._progressEvent.observable.observe(({ isIterating }) => {
      if (isIterating) return;
      this._animationState.value = 'STATIC';
    });

    this._setState = new Observable<RGB | null>(
      { b: 0, g: 0, r: 0 },
      (value) => {
        if (value === null) return;

        this._setFromRGB(value);
      },
    );
    this.setState = new ProxyObservable(
      this._setState,
      (value) => (value === null ? { b: 0, g: 0, r: 0 } : value),
      (value) => value,
    );
  }

  private async _set(request: OutputDimmableRGBRequest, skipIndicator = false) {
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

  private async _setFromRGB(value: RGB, skipIndicator?: boolean) {
    return this._set(
      setRGB(value, this.customRampTime.value ?? undefined),
      skipIndicator,
    );
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
    await this.set(blink(count, undefined, undefined, 0));
  }

  async set(value: OutputDimmableRGBRequest): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();

    this._animationState.observe((animationState, observer) => {
      if (animationState !== 'STATIC') return;

      resolve();
      observer.remove();
    }, true);

    this._setState.value = null;
    await this._set(value);

    return promise;
  }
}
