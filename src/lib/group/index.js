const EventEmitter = require('events');
const { Relay } = require('../relay');
const { LedLight } = require('../led');
const { DoorSensor } = require('../door-sensor');
const { RoomSensor } = require('../room-sensor');

class DoorSensorGroup extends EventEmitter {
  constructor(instances = []) {
    instances.forEach((instance) => {
      if (instance instanceof DoorSensor) return;

      throw new Error('insufficient options provided');
    });

    super();

    instances.forEach((instance) => {
      instance.on('change', () => {
        this.emit('change');
      });
    });

    this._instances = instances;
  }

  get isOpen() {
    return this._instances.some((instance) => {
      return instance.isOpen;
    });
  }
}

class PushMetricGroup extends EventEmitter {
  constructor(metric, instances = []) {
    instances.forEach((instance) => {
      if (instance instanceof RoomSensor) return;

      throw new Error('insufficient options provided');
    });

    super();

    instances.forEach((instance) => {
      instance.on(metric, () => {
        this.emit(metric);
      });
    });

    this._instances = instances;
    this._metric = metric;
  }

  getState() {
    return this._instances.map((roomSensor) => {
      return roomSensor.getState(this._metric);
    });
  }
}

class LightGroup extends EventEmitter {
  constructor(instances = [], allOf = false) {
    instances.forEach((instance) => {
      if (
        instance instanceof Relay
        || instance instanceof LedLight
      ) return;

      throw new Error('insufficient options provided');
    });

    super();

    this._isChanging = false;

    instances.forEach((instance) => {
      instance.on('change', () => {
        if (this._isChanging) return;
        this.emit('change');
      });
    });

    instances.forEach((instance) => {
      instance.on('set', () => {
        this.emit('set');
      });
    });

    this._instances = instances;
    this._allOf = allOf;
    this._interceptor = null;
  }

  get power() {
    const sane = this._instances.filter((instance) => {
      return instance.power !== null;
    });

    if (this._allOf) {
      return sane.every((instance) => {
        return instance.power;
      });
    }

    return sane.some((instance) => {
      return instance.power;
    });
  }

  setPower(on, force = false) {
    this._isChanging = true;
    const calls = (!force && this._interceptor)
      ? this._interceptor(on, this._instances)
      : this._instances.map((instance) => {
        return instance.setPower(on);
      });

    return Promise.all(calls).then((values) => {
      this.emit('change');
      this._isChanging = false;

      return values;
    });
  }

  toggle() {
    return this.setPower(!this.power);
  }

  setInterceptor(fn) {
    if (typeof fn !== 'function') throw new Error('interceptor (fn) is not a function');
    this._interceptor = fn;
  }
}

module.exports = {
  DoorSensorGroup,
  PushMetricGroup,
  LightGroup
};
