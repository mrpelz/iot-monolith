import { Base } from '../base/index.js';
import { Ev1527Device } from '../ev1527/index.js';
import { rebind } from '../utils/oop.js';

const libName = 'door-sensor';

function makeMatchOptions(id) {
  return {
    device: {
      debounce: 1500,
      match: {
        id,
        model: 'Generic Remote',
      },
    },
    states: {
      close: {
        match: {
          cmd: 14,
        },
      },
      open: {
        match: {
          cmd: 10,
        },
      },
      tamper: {
        debounce: 0,
        match: {
          cmd: 7,
        },
      },
    },
  };
}

export class DoorSensor extends Base {
  constructor(options = {}) {
    const { id = null, server = null, isOpen = null } = options;

    if (!id || !server) {
      throw new Error('insufficient options provided');
    }

    super();

    this._doorSensor = {};
    this.isOpen = isOpen;

    rebind(this, '_handleClose', '_handleOpen', '_handleTamper');

    const ev1527device = new Ev1527Device({
      id,
      match: makeMatchOptions(id),
      server,
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
    this.emit('tamper');
  }
}
