const { Base } = require('../base');
const { Ev1527Device } = require('../ev1527');
const { rebind } = require('../utils/oop');

const libName = 'door-sensor';

function makeMatchOptions(id) {
  return {
    device: {
      match: {
        model: 'Generic Remote',
        id
      },
      debounce: 1500
    },
    states: {
      close: {
        match: {
          cmd: 14
        }
      },
      open: {
        match: {
          cmd: 10
        }
      },
      tamper: {
        match: {
          cmd: 7
        },
        debounce: 0
      }
    }
  };
}

class DoorSensor extends Base {
  constructor(options = {}) {
    const {
      id = null,
      server = null,
      isOpen = null,
      isTampered = false
    } = options;

    if (!id || !server) {
      throw new Error('insufficient options provided');
    }

    super();

    this._doorSensor = {};
    this.isOpen = isOpen;
    this.isTampered = isTampered;

    rebind(this, '_handleClose', '_handleOpen', '_handleTamper');

    const ev1527device = new Ev1527Device({
      id,
      server,
      match: makeMatchOptions(id)
    });
    ev1527device.on('close', this._handleClose);
    ev1527device.on('open', this._handleOpen);
    ev1527device.on('tamper', this._handleTamper);

    this.log.friendlyName(id);
    this._doorSensor.log = this.log.withPrefix(libName);
  }

  _handleClose() {
    const { log } = this._doorSensor;

    if (this.isOpen !== false) {
      log.info('sensor was closed');

      this.isOpen = false;
      this.emit('change');
    }
  }

  _handleOpen() {
    const { log } = this._doorSensor;

    if (this.isOpen !== true) {
      log.info('sensor was opened');

      this.isOpen = true;
      this.emit('change');
    }
  }

  _handleTamper() {
    const { log } = this._doorSensor;
    log.alert('sensor was tampered with!');

    this.isOpen = null;
    this.isTampered = true;
    this.emit('tamper');
    this.emit('change');
  }
}

module.exports = {
  DoorSensor
};
