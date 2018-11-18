const { SingleRelay } = require('../single-relay');

class LightGroup {
  constructor(...instances) {
    instances.forEach((instance) => {
      if (instance instanceof SingleRelay) return;

      throw new Error('insufficient options provided');
    });

    this._instances = instances;
  }

  relay(on) {
    const calls = this._instances.map((instance) => {
      return instance.relay(on);
    });

    return Promise.all(calls);
  }

  relayToggle() {
    const on = this._instances.reduce((prev, instance) => {
      return prev || instance.relayState;
    }, false);

    const calls = this._instances.map((instance) => {
      return instance.relay(!on);
    });

    return Promise.all(calls);
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
