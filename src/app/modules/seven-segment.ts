import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import {
  RecurringMoment,
  Scheduler,
  Timer,
  every,
} from '../../lib/utils/time.js';
import { rebind, resolveAlways } from '../../lib/utils/oop.js';
import { EventEmitter } from 'events';
import { HttpServer } from '../../lib/http/server.js';
import { RoomSensorState } from './room-sensors.js';
import { SevenSegment } from '../../lib/seven-segment/index.js';
import { setUpConnectionHmi } from '../utils/hmi.js';

export type SevenSegmentConfig = ApplicationConfig['globals']['sevenSegment'];
export type SevenSegmentState = SevenSegmentConfig & {
  instance: SevenSegment;
  clock?: SevenSegmentClock;
};

export type State = {
  sevenSegment: SevenSegmentState;
};

class SevenSegmentClock extends EventEmitter {
  instance: SevenSegment;

  scheduler: Scheduler;

  private _active: boolean;

  constructor(instance: SevenSegment, scheduler: Scheduler) {
    super();

    this.instance = instance;
    this.scheduler = scheduler;

    this._active = false;

    rebind(this, '_setTime');

    new RecurringMoment({ scheduler }, every.minute(1)).on(
      'hit',
      this._setTime
    );
  }

  get active() {
    return this._active;
  }

  _setTime() {
    if (!this._active || !this.instance._reliableSocket.state.isConnected) {
      return;
    }

    const now = new Date();
    const timeString = `${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;

    resolveAlways(this.instance.setString(timeString));
  }

  toggle(on?: boolean) {
    if (on === undefined) {
      this._active = !this._active;
    } else {
      this._active = Boolean(on);
    }

    this.emit('change');

    this._setTime();
  }
}

function createSevenSegment(sevenSegment: SevenSegmentConfig) {
  const { host, port } = sevenSegment;

  try {
    return new SevenSegment({
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { sevenSegment: sevenSegmentConfig },
  } = config;

  const { disable = false, name } = sevenSegmentConfig;

  if (disable || !name) return;

  const instance = createSevenSegment(sevenSegmentConfig);

  if (!instance) return;

  instance.connect();

  const sevenSegment = {
    ...sevenSegmentConfig,
    instance,
  };

  Object.defineProperty(data, 'sevenSegment', {
    value: sevenSegment,
  });
}

function manageSevenSegment(
  sevenSegment: SevenSegmentState,
  httpHookServer: HttpServer
) {
  if (!sevenSegment) return;

  const { instance } = sevenSegment;

  httpHookServer.route('/7segment', (request: any) => {
    const {
      urlQuery: { s },
    } = request;

    if (s === undefined) {
      return {
        handler: Promise.reject(new Error('string not set')),
      };
    }

    return {
      handler: instance.setString(s).then((value) => {
        return `${value}`;
      }),
    };
  });
}

async function createClock(
  scheduler: Scheduler,
  sevenSegment: SevenSegmentState
) {
  if (!sevenSegment) return;

  const { instance } = sevenSegment;

  const clock = new SevenSegmentClock(instance, scheduler);

  Object.defineProperty(sevenSegment, 'clock', {
    value: clock,
  });
}

function kuecheRoomSensorWithClockToggle(
  roomSensors: RoomSensorState[],
  sevenSegment: SevenSegmentState
) {
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

  if (!clock) return;

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

function sevenSegmentHmi(
  sevenSegment: SevenSegmentState,
  hmiServer: HmiServer
) {
  if (!sevenSegment) return;

  const { clock, name } = sevenSegment;

  setUpConnectionHmi(sevenSegment, 'seven-segment', hmiServer);

  if (!clock) return;

  const hmi = new HmiElement({
    attributes: {
      category: 'other',
      group: 'clock',
      section: 'kueche',
      setType: 'trigger',
      sortCategory: '_bottom',
      type: 'binary-light',
    },
    getter: () => {
      return Promise.resolve(clock.active ? 'on' : 'off');
    },
    name,
    server: hmiServer,
    settable: true,
  });

  clock.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(clock.toggle());
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const {
    hmiServer,
    httpHookServer,
    roomSensors,
    scheduler,
    sevenSegment,
  } = data;

  if (!sevenSegment) return;

  manageSevenSegment(sevenSegment, httpHookServer);
  createClock(scheduler, sevenSegment);
  kuecheRoomSensorWithClockToggle(roomSensors, sevenSegment);
  sevenSegmentHmi(sevenSegment, hmiServer);
}
