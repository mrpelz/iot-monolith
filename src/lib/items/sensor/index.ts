import { Observable, ReadOnlyObservable } from '../../observable/index.js';
import { Schedule } from '../../schedule/index.js';
import { Service } from '../../device/index.js';

export class SingleValueSensor<T = unknown> {
  private readonly _service: Service<T, void>;
  private readonly _state = new Observable<T | null>(null);

  readonly state: ReadOnlyObservable<T | null>;

  constructor(service: Service<T, void>, schedule: Schedule) {
    this._service = service;
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
      }
    });

    this.state = new ReadOnlyObservable(this._state);

    schedule.addTask(() => this._get());
  }

  private async _get() {
    try {
      const result = await this._service.request(undefined, true);
      if (result === null) {
        this._unknown();
        return;
      }

      this._success(result);
    } catch {
      this._unknown();
    }
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
  K extends keyof T
> {
  private readonly _properties: K[];
  private readonly _service: Service<T, void>;
  private readonly _state = {} as { [P in keyof T]: Observable<T[P] | null> };

  readonly state = {} as {
    [P in keyof T]: ReadOnlyObservable<T[P] | null>;
  };

  constructor(service: Service<T, void>, properties: K[], schedule: Schedule) {
    this._properties = properties;

    this._service = service;
    this._service.isOnline.observe((online) => {
      if (!online) {
        this._unknown();
      }
    });

    for (const property of this._properties) {
      this._state[property] = new Observable(null);
      this.state[property] = new ReadOnlyObservable(this._state[property]);
    }

    schedule.addTask(() => this._get());
  }

  private async _get() {
    try {
      const result = await this._service.request(undefined, true);
      if (result === null) {
        this._unknown();
        return;
      }

      this._success(result);
    } catch {
      this._unknown();
    }
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
