import { jsonParseGuarded } from '@mrpelz/misc-utils/data';
import { isPlainObject, Primitive } from '@mrpelz/misc-utils/oop';
import { NullState, ReadOnlyNullState } from '@mrpelz/observable/state';

import { Schedule } from './schedule.js';

export class HTTPPoll<I extends string, T extends Record<I, Primitive>> {
  private readonly _events = new NullState<T>();
  private readonly _handledIdentifiers = new Set<Primitive>();

  readonly events = new ReadOnlyNullState(this._events);

  constructor(
    schedule: Schedule,
    private _url: string | URL,
    private _init?: RequestInit,
    private _identifier = 'id' as I,
  ) {
    schedule.addTask(() => this._task());
  }

  private async _poll(): Promise<T[] | undefined> {
    const payload = jsonParseGuarded(
      await fetch(this._url, this._init).then((response) => response.text()),
    );

    if (!payload || !Array.isArray(payload) || payload.length === 0) {
      return undefined;
    }

    for (const item of payload) {
      if (!isPlainObject(item)) return undefined;
      if (!(this._identifier in item)) return undefined;
    }

    return payload;
  }

  private async _task() {
    const pollResult = await this._poll();
    if (!pollResult) return;

    for (const item of pollResult) {
      const id = item[this._identifier];
      if (this._handledIdentifiers.has(id)) continue;

      this._handledIdentifiers.add(id);

      this._events.trigger(item);
    }
  }
}

// const test = new HTTPPoll(
//   new Schedule(
//     new Logger(),
//     () => new ModifiableDate().ceil(Unit.SECOND, 5).date,
//     true,
//   ),
//   'https://nina.api.proxy.bund.dev/api31/dashboard/020000000000.json',
//   {
//     headers: {
//       accept: 'application/json',
//     },
//   },
// );

// // eslint-disable-next-line no-console
// test.events.observe((event) => console.log(event));
