/* eslint-disable no-nested-ternary */
/* eslint-disable unicorn/no-nested-ternary */
import { safeAsync } from '@mrpelz/misc-utils/async';
import { isPlainObject } from '@mrpelz/misc-utils/oop';
import { Observable, ReadOnlyObservable } from '@mrpelz/observable';
import { BooleanState, EnumState } from '@mrpelz/observable/state';

import { TOutputProgress as OutputNgProgressEvent } from '../events/output-ng-progress.js';
import {
  blink,
  ITERATE_INFINITE,
  off,
  on,
  OutputBinary as OutputBinaryService,
  OutputBinaryRequest,
} from '../services/output-ng-binary.js';
import { OutputDimmable } from './output-ng-dimmable.js';
import { OutputDimmableRGB } from './output-ng-dimmable-rgb.js';

export type OutputIndicator = OutputBinary | OutputDimmable | OutputDimmableRGB;

export const AnimationState = ['STATIC', 'FINITE', 'INFINITE'] as const;
export type TAnimationState = (typeof AnimationState)[number];

export const universalIndicatorBlink = async (
  indicatorService: OutputIndicator,
  count: number,
): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  if (indicatorService instanceof OutputBinary) {
    await indicatorService.blink(count);
  }
  if (indicatorService instanceof OutputDimmable) {
    await indicatorService.blink(count);
  }
  if (indicatorService instanceof OutputDimmableRGB) {
    await indicatorService.blink(count);
  }
};

export class OutputBinary {
  private readonly _actualState = new Observable<boolean | null>(null);
  private readonly _animationState = new EnumState(AnimationState, 'STATIC');

  private _isSequenceRequestInProgress = false;

  readonly $exclude = true as const;

  readonly actualState = new ReadOnlyObservable(this._actualState);
  readonly animationState = new ReadOnlyObservable(this._animationState);

  readonly setState: BooleanState;

  constructor(
    private readonly _service: OutputBinaryService,
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

    this.setState = new BooleanState(false, (value) => this._set(value));
  }

  private async _set(
    value: boolean | OutputBinaryRequest,
    skipIndicator = false,
  ) {
    if (this._isSequenceRequestInProgress) return;
    this._isSequenceRequestInProgress = true;

    const request = isPlainObject(value) ? value : value ? on() : off();

    const endState = request.sequence.at(-1)?.value;
    if (endState === undefined) {
      this._isSequenceRequestInProgress = false;
      return;
    }

    this.setState.value = endState;
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

  async set(value: OutputBinaryRequest): Promise<void> {
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
