const EventEmitter = require('events');

const { resolveAlways, rebind } = require('../../libs/utils/oop');
const { every, RecurringMoment } = require('../../libs/utils/time');

function manage(sevenSegment, httpHookServer) {
  if (!sevenSegment) return;

  const { instance } = sevenSegment;

  httpHookServer.route('/7segment', (request) => {
    const {
      urlQuery: { s }
    } = request;

    if (s === undefined) {
      return {
        handler: Promise.reject(new Error('string not set'))
      };
    }

    return {
      handler: instance.setString(s).then((value) => {
        return `${value}`;
      })
    };
  });
}

async function createClock(scheduler, sevenSegment) {
  if (!sevenSegment) return;

  const { instance } = sevenSegment;

  const clock = new (class extends EventEmitter {
    constructor() {
      super();

      this._active = false;

      rebind(this, '_setTime');

      new RecurringMoment(
        scheduler,
        every.minute(1)
      ).on('hit', this._setTime);

      this._setTime();
    }

    get active() {
      return this._active;
    }

    _setTime() {
      if (!this._active) {
        return;
      }

      const now = new Date();
      const timeString = `${
        now.getHours().toString().padStart(2, '0')
      }${
        now.getMinutes().toString().padStart(2, '0')
      }`;

      resolveAlways(instance.setString(timeString));
    }

    toggle(on) {
      if (on === undefined) {
        this._active = !this._active;
      } else {
        this._active = Boolean(on);
      }

      this.emit('change');

      if (!this._active) {
        resolveAlways(instance.clear());
      }

      this._setTime();
    }
  })();

  Object.assign(sevenSegment, {
    clock
  });
}

function kuecheLedWithClockToggle(lightGroups, sevenSegment) {
  const name = 'kuecheAmbience';
  const lightMatch = lightGroups.find(({ name: n }) => {
    return n === name;
  });

  const { instance: lightInstance } = lightMatch || {};

  if (!lightMatch || !lightInstance) {
    throw new Error('could not find light');
  }

  const { clock } = sevenSegment || {};

  if (!sevenSegment || !clock) {
    throw new Error('could not find sevenSegment');
  }

  lightInstance.on('change', () => {
    clock.toggle(lightInstance.power);
  });
}

(function main() {
  const {
    httpHookServer,
    lightGroups,
    scheduler,
    sevenSegment
  } = global;

  if (!sevenSegment) return;

  manage(sevenSegment, httpHookServer);
  createClock(scheduler, sevenSegment);
  kuecheLedWithClockToggle(lightGroups, sevenSegment);
}());
