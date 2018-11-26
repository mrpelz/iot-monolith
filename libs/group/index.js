const EventEmitter = require('events');
const { SingleRelay } = require('../single-relay');
const { LedLight } = require('../led');

class LightGroup extends EventEmitter {
  constructor(instances, events = []) {
    instances.forEach((instance) => {
      if (
        instance instanceof SingleRelay
        || instance instanceof LedLight
      ) return;

      throw new Error('insufficient options provided');
    });

    super();

    this._isChanging = false;

    events.forEach((event) => {
      instances.forEach((instance) => {
        instance.on(event, (...data) => {
          this.emit(event, ...data);
        });
      });
    });

    instances.forEach((instance) => {
      instance.on('change', () => {
        if (this._isChanging) return;
        this.emit('change');
      });
    });

    this._instances = instances;
  }

  get power() {
    return this._instances.some((instance) => {
      return instance.power;
    });
  }

  setPower(on) {
    this._isChanging = true;
    const calls = this._instances.map((instance) => {
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

  led(on) {
    const calls = this._instances.map((instance) => {
      return instance.led(on);
    });

    return Promise.all(calls);
  }

  ledBlink(count) {
    const calls = this._instances.map((instance) => {
      return instance.ledBlink(count);
    });

    return Promise.all(calls);
  }
}

module.exports = {
  LightGroup
};
