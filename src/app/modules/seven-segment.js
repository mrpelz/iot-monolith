const EventEmitter = require('events');

const { HmiElement } = require('../../lib/hmi');
const { SevenSegment } = require('../../lib/seven-segment');
const { resolveAlways, rebind } = require('../../lib/utils/oop');
const { every, RecurringMoment, Timer } = require('../../lib/utils/time');

const { setUpConnectionHmi } = require('../utils/hmi');


function createSevenSegment(sevenSegment) {
  const {
    host,
    port
  } = sevenSegment;

  try {
    return new SevenSegment({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

function create(config, data) {
  const {
    globals: {
      sevenSegment: sevenSegmentConfig
    }
  } = config;

  const { disable = false, name, host } = sevenSegmentConfig;

  if (disable || !name) return;

  const instance = createSevenSegment(sevenSegmentConfig);

  if (!instance) return;

  instance.log.friendlyName(`${name} (HOST: ${host})`);
  instance.connect();

  const sevenSegment = Object.assign({}, sevenSegmentConfig, {
    instance
  });

  Object.assign(data, {
    sevenSegment
  });
}


function manageSevenSegment(sevenSegment, httpHookServer) {
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
        { scheduler },
        every.minute(1)
      ).on('hit', this._setTime);
    }

    get active() {
      return this._active;
    }

    _setTime() {
      if (!this._active || !instance._reliableSocket.state.isConnected) {
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

      this._setTime();
    }
  })();

  Object.assign(sevenSegment, {
    clock
  });
}

function kuecheRoomSensorWithClockToggle(roomSensors, sevenSegment) {
  if (!sevenSegment) {
    throw new Error('could not find sevenSegment');
  }

  const roomSensor = roomSensors.find(({ name }) => {
    return name === 'kueche';
  });

  if (!roomSensor) {
    throw new Error('could not find room sensor instance');
  }

  if (!roomSensor.metrics.includes('movement')) {
    throw new Error('room sensor has no movement metric');
  }

  const { clock } = sevenSegment;
  const { instance: roomSensorInstance } = roomSensor;

  const timer = new Timer(10000);

  timer.on('hit', () => {
    resolveAlways(clock.toggle(false));
  });

  roomSensorInstance.on('movement', () => {
    if (roomSensorInstance.getState('movement')) {
      timer.stop();
      resolveAlways(clock.toggle(true));
      return;
    }

    timer.start();
  });
}

function sevenSegmentHmi(sevenSegment, hmiServer) {
  if (!sevenSegment) return;

  const { clock, name } = sevenSegment;

  setUpConnectionHmi(sevenSegment, 'seven-segment', hmiServer);

  const hmi = new HmiElement({
    name,
    attributes: {
      category: 'other',
      group: 'clock',
      section: 'kueche',
      setType: 'trigger',
      sortCategory: '_bottom',
      type: 'binary-light'
    },
    server: hmiServer,
    getter: () => {
      return Promise.resolve(clock.active ? 'on' : 'off');
    },
    settable: true
  });

  clock.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(clock.toggle());
  });
}

function manage(_, data) {
  const {
    hmiServer,
    httpHookServer,
    roomSensors,
    scheduler,
    sevenSegment
  } = data;

  if (!sevenSegment) return;

  manageSevenSegment(sevenSegment, httpHookServer);
  createClock(scheduler, sevenSegment);
  kuecheRoomSensorWithClockToggle(roomSensors, sevenSegment);
  sevenSegmentHmi(sevenSegment, hmiServer);
}


module.exports = {
  create,
  manage
};
