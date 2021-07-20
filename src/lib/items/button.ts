import { Button as ButtonEvent, ButtonPayload } from '../events/button.js';
import { Observer } from '../observable.js';

type Matcher = (payload: ButtonPayload) => boolean;
type Callback = () => void;

export class Button {
  private readonly _event: ButtonEvent;

  constructor(event: ButtonEvent) {
    this._event = event;
  }

  doublePress(callback: Callback): Observer {
    return this.repeatPresses(callback, 2);
  }

  down(callback: Callback): Observer {
    return this.match(callback, ({ down, downChanged }) => down && downChanged);
  }

  downFor(callback: Callback, duration = 1500): Observer {
    let lock = false;

    return this.match(callback, ({ down, previousDuration }) => {
      if (!down) {
        lock = false;
        return false;
      }

      if (lock) return false;

      const match = down && previousDuration >= duration;
      if (match) lock = true;

      return match;
    });
  }

  longPress(callback: Callback, duration = 300): Observer {
    let lock = false;

    return this.match(callback, ({ down, longpress, previousDuration }) => {
      if (!down) {
        const match = !lock && previousDuration >= duration;
        lock = false;

        return match;
      }

      if (lock) return false;

      const match =
        down && Boolean(longpress) && previousDuration >= duration + 300;
      if (match) lock = true;

      return match;
    });
  }

  match(callback: Callback, ...matchers: Matcher[]): Observer {
    const subscription = this._event.observable.observe((payload) => {
      for (const matcher of matchers) {
        if (matcher(payload)) {
          callback();
          return;
        }
      }
    });

    return {
      remove: () => subscription.remove(),
    };
  }

  repeatPresses(callback: Callback, presses = 2): Observer {
    const repeats = presses - 1;
    if (!repeats) {
      throw new Error('unsupported number of presses');
    }

    return this.match(
      callback,
      ({ down, repeat }) => !down && repeat === repeats
    );
  }

  shortPress(callback: Callback, maxDuration = 300): Observer {
    return this.up(callback, maxDuration);
  }

  triplePress(callback: Callback): Observer {
    return this.repeatPresses(callback, 3);
  }

  up(callback: Callback, maxDuration = 300): Observer {
    return this.match(
      callback,
      ({ down, downChanged, previousDuration }) =>
        !down && downChanged && previousDuration < maxDuration
    );
  }

  upAfter(callback: Callback, duration = 1500): Observer {
    return this.match(
      callback,
      ({ down, previousDuration }) => !down && previousDuration >= duration
    );
  }
}
