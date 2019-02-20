const { MessageClient } = require('../messaging');
const { CachePromise } = require('../cache');
const {
  readNumber,
  writeNumber
} = require('../utils/data');
const { rebind, resolveAlways } = require('../utils/oop');
const { Remap } = require('../utils/logic');
const { Timer, sleep } = require('../utils/time');

const libName = 'vent';

const minTarget = 0;
const maxTarget = 7;

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

class Vent extends MessageClient {
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
      default: 0,
      caches: {
        actualIn: new CachePromise(1000),
        actualOut: new CachePromise(1000)
      },
      timer: new Timer(setDefaultTimeout)
    };

    this.targetSetpoint = this._vent.default;
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

    this.on('connect', this._handleVentConnection);
    this.on('switchRaw', this._handleSwitchChange);
    this._vent.timer.on('hit', this._handleDefaultTimer);

    this.log.friendlyName(`ventcontroller (${host}:${port})`);
    this._vent.log = this.log.withPrefix(libName);
  }

  get targetPercentage() {
    return stateRemap.convert('control', 'percent', this.target);
  }

  get default() {
    return this._vent.default;
  }

  async _handleVentConnection() {
    await sleep(1000);
    resolveAlways(this.setTarget(this.targetSetpoint, true));
  }

  _handleSwitchChange(_, switchState) {
    this._vent.timer.stop();

    this._vent.default = stateRemap.convert('switch', 'control', switchState);
    resolveAlways(this.resetTarget());

    this.emit('switch', this._vent.default);
  }

  _handleDefaultTimer() {
    resolveAlways(this.resetTarget());
  }

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
      });
    }

    return this.request(direction).then(adcToFlowRate).catch((reason) => {
      log.error({
        head: `get [uncached] (${direction}) error`,
        attachment: reason
      });
    });
  }

  getActualIn() {
    return this._getActual('actualIn');
  }

  getActualOut() {
    return this._getActual('actualOut');
  }

  setTarget(target, suppressTimer = false) {
    if (target < this.minTarget || target > this.maxTarget) {
      return Promise.reject(new Error('illegal target value'));
    }

    const { log, timer } = this._vent;

    this.targetSetpoint = target;

    this.emit('set');

    if (this.targetSetpoint === this.target) {
      return Promise.resolve(this.target);
    }

    return this.request('target', this.targetSetpoint).then((result) => {
      if (result !== this.targetSetpoint) {
        throw new Error('could not set target');
      }

      if (result !== this.target) {
        this.target = this.targetSetpoint;
        this.emit('change');
      }

      if (!suppressTimer) {
        timer.start();
      }

      return this.target;
    }).catch((reason) => {
      log.error({
        head: 'target error',
        attachment: reason
      });
    });
  }

  resetTarget() {
    return this.setTarget(this._vent.default, true);
  }
}

module.exports = {
  Vent
};
