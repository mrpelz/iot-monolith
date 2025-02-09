import { Service } from '../device/main.js';
import { Observable, ReadOnlyObservable } from '../observable.js';
import { promiseGuard } from '../promise.js';
import { Schedule } from '../schedule.js';

export type MeasurementInputGetter<T> = () => T | null | Promise<T | null>;

export class SingleValueSensor<T = unknown, S = void> {
  private readonly _measurementInputGetter: S extends void
    ? undefined
    : MeasurementInputGetter<S>;

  private readonly _service: Service<T, S>;
  private readonly _state = new Observable<T | null>(null);

  readonly $exclude = true as const;

  readonly state: ReadOnlyObservable<T | null>;

  constructor(service: Service<T, void>, schedule: Schedule);

  constructor(
    service: Service<T, S>,
    schedule: Schedule,
    measurementInputGetter: MeasurementInputGetter<S>,
  );

  constructor(
    service: Service<T, S>,
    schedule: Schedule,
    measurementInputGetter?: MeasurementInputGetter<S>,
  ) {
    this._measurementInputGetter =
      measurementInputGetter as typeof this._measurementInputGetter;

    this._service = service;

    this.state = new ReadOnlyObservable(this._state);

    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
      }
    });

    schedule.addTask(() => this._get());
  }

  private async _get() {
    const measurementInputGetter = this._measurementInputGetter;

    const input = measurementInputGetter
      ? await (async () => {
          try {
            return measurementInputGetter();
          } catch {
            return null;
          }
        })()
      : null;

    if (measurementInputGetter && input === null) return;

    const result = await (async () => {
      try {
        return promiseGuard(this._service.request(input as S, true));
      } catch {
        return null;
      }
    })();

    if (result === null) {
      this._unknown();
      return;
    }

    this._success(result);
  }

  private _success(result: T) {
    this._state.value = result;
  }

  private _unknown() {
    this._state.value = null;
  }
}

export class MultiValueSensor<
  T extends Record<string, unknown>,
  K extends keyof T,
  S = void,
> {
  private readonly _measurementInputGetter: S extends void
    ? undefined
    : MeasurementInputGetter<S>;

  private readonly _properties: readonly K[];
  private readonly _service: Service<T, S>;
  private readonly _state = {} as { [P in K]: Observable<T[P] | null> };

  readonly $exclude = true as const;

  readonly state = {} as {
    [P in K]: ReadOnlyObservable<T[P] | null>;
  };

  constructor(
    service: Service<T, void>,
    properties: readonly K[],
    schedule: Schedule,
  );

  constructor(
    service: Service<T, S>,
    properties: readonly K[],
    schedule: Schedule,
    measurementInputGetter: MeasurementInputGetter<S>,
  );

  constructor(
    service: Service<T, S>,
    properties: readonly K[],
    schedule: Schedule,
    measurementInputGetter?: MeasurementInputGetter<S>,
  ) {
    this._measurementInputGetter =
      measurementInputGetter as typeof this._measurementInputGetter;

    this._properties = properties;
    this._service = service;

    for (const property of this._properties) {
      this._state[property] = new Observable(null);
      this.state[property] = new ReadOnlyObservable(this._state[property]);
    }

    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
      }
    });

    schedule.addTask(() => this._get());
  }

  private async _get() {
    const measurementInputGetter = this._measurementInputGetter;

    const input = measurementInputGetter
      ? await (async () => {
          try {
            return measurementInputGetter();
          } catch {
            return null;
          }
        })()
      : null;

    if (measurementInputGetter && input === null) return;

    const result = await (async () => {
      try {
        return promiseGuard(this._service.request(input as S, true));
      } catch {
        return null;
      }
    })();

    if (result === null) {
      this._unknown();
      return;
    }

    this._success(result);
  }

  private _success(result: T) {
    for (const property of this._properties) {
      this._state[property].value = result[property];
    }
  }

  private _unknown() {
    for (const property of this._properties) {
      this._state[property].value = null;
    }
  }
}
