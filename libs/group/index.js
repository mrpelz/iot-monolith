const EventEmitter = require('events');
const { SingleRelay } = require('../single-relay');

class SingleRelayLightGroup extends EventEmitter {
  constructor(instances, events = []) {
    instances.forEach((instance) => {
      if (instance instanceof SingleRelay) return;

      throw new Error('insufficient options provided');
    });

    super();

    events.forEach((event) => {
      instances.forEach((instance) => {
        instance.on(event, (...data) => {
          this.emit(event, ...data);
        });
      });
    });

    this._instances = instances;
  }

  isOn() {
    return this._instances.some((instance) => {
      return instance.relayState;
    });
  }

  relay(on) {
    const calls = this._instances.map((instance) => {
      return instance.relay(on);
    });

    return Promise.all(calls).then((values) => {
      this.emit('change');

      return values;
    });
  }

  relayToggle() {
    const on = this.isOn();
    return this.relay(!on);
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
  SingleRelayLightGroup
};
