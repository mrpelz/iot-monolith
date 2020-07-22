import { PriorityValue, Remap } from '../utils/logic.js';
import { Timer, sleep } from '../utils/time.js';
import { readNumber, writeNumber } from '../utils/data.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { CachePromise } from '../cache/index.js';
import { MessageClient } from '../messaging/index.js';

const libName = 'vent';

const minTarget = 0;
const maxTarget = 7;

const userPriority = 3;

const stateRemap = new Remap([{
  switch: [0, 1024],
  control: [minTarget, maxTarget],
  percent: [0, 100]
}]);

const adcToFlowRate = (input) => {
  return input * 0.28769663;
};

const messageTypes = [
  {
    name: 'actualIn',
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([1, 0])
  },
  {
    name: 'actualOut',
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([1, 1])
  },
  {
    name: 'target',
    generator: (input) => {
      return writeNumber(input, 1);
    },
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([2])
  },
  {
    name: 'switch',
    eventName: 'switchRaw',
    eventParser: (payload) => {
      return readNumber(payload.slice(1), 2);
    },
    parser: (payload) => {
      return readNumber(payload, 2);
    },
    head: Buffer.from([3])
  }
];

export class Vent extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      setDefaultTimeout = 0
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes
    });

    this.minTarget = minTarget;
    this.maxTarget = maxTarget;

    this._vent = {
      default: undefined,
      caches: {
        actualIn: new CachePromise(1000),
        actualOut: new CachePromise(1000)
      },
      timer: new Timer(setDefaultTimeout)
    };

    this.targetSetpointPriority = new PriorityValue(0);
    this.target = undefined;

    this.actualIn = undefined;
    this.actualOut = undefined;

    rebind(
      this,
      '_handleVentConnection',
      '_handleSwitchChange',
      '_handleDefaultTimer',
      'getActualIn',
      'getActualOut',
      'setTarget'
    );

    this.on('reliableConnect', this._handleVentConnection);
    this.on('switchRaw', this._handleSwitchChange);
    this._vent.timer.on('hit', this._handleDefaultTimer);

    this.log.friendlyName(`ventcontroller (${host}:${port})`);
    this._vent.log = this.log.withPrefix(libName);
  }

  get targetSetpoint() {
    return this.targetSetpointPriority.value;
  }

  get targetPercentage() {
    return stateRemap.convert('control', 'percent', this.target);
  }

  get default() {
    return this._vent.default;
  }

  async _handleVentConnection() {
    await sleep(1000);
    resolveAlways(this.commitTarget());
  }

  _handleSwitchChange(_, switchState) {
    this._vent.timer.stop();

    const newDefault = stateRemap.convert('switch', 'control', switchState);

    if (newDefault === this._vent.default) return;

    this._vent.default = newDefault;
    // clear all set priorities from PriorityValue instance
    this.targetSetpointPriority.withdraw();
    this.setTarget(this._vent.default, 0);
    resolveAlways(this.commitTarget());

    this.emit('switch', this._vent.default);
  }

  _handleDefaultTimer() {
    this.unsetTarget();
    resolveAlways(this.commitTarget());
  }

  /**
   * @param {'actualIn'| 'actualOut'} direction
   */
  _getActual(direction) {
    const {
      log,
      caches: {
        [direction]: cache
      } = {}
    } = this._vent;

    if (cache) {
      if (cache.hit()) {
        return cache.defer();
      }

      return cache.promise(this.request(direction).then(adcToFlowRate)).catch((reason) => {
        log.error({
          head: `get [cached] (${direction}) error`,
          attachment: reason
        });

        throw reason;
      });
    }

    return this.request(direction).then(adcToFlowRate).catch((reason) => {
      log.error({
        head: `get [uncached] (${direction}) error`,
        attachment: reason
      });

      throw reason;
    });
  }

  getActualIn() {
    return this._getActual('actualIn');
  }

  getActualOut() {
    return this._getActual('actualOut');
  }

  setTarget(target, priority = userPriority) {
    if (target < this.minTarget || target > this.maxTarget) {
      throw new Error('illegal target value');
    }

    const { timer } = this._vent;
    if (priority === userPriority) {
      timer.start();
    }

    this.targetSetpointPriority.set(target, priority);
  }

  unsetTarget(priority = userPriority) {
    this.targetSetpointPriority.withdraw(priority);
  }

  commitTarget() {
    const { log } = this._vent;

    this.emit('set');

    if (this.targetSetpoint === this.target) {
      return Promise.resolve(this.target);
    }

    return this.request('target', Buffer.from([this.targetSetpoint])).then((result) => {
      if (result !== this.targetSetpoint) {
        throw new Error('could not set target');
      }

      if (result !== this.target) {
        this.target = this.targetSetpoint;
        this.emit('change');
      }

      return this.target;
    }).catch((reason) => {
      log.error({
        head: 'target error',
        attachment: reason
      });

      throw reason;
    });
  }
}
