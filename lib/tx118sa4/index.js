const { Ev1527Device } = require('../ev1527');

const libName = 'tx118sa4';

function makeMatchOptions(id) {
  return {
    device: {
      match: {
        model: (m) => {
          return ['TX118SA-4', 'TX118SA-4 Wallswitch'].includes(m);
        },
        id
      },
      debounce: 500
    },
    states: {
      1: {
        match: {
          channels: (c) => {
            return c.includes(1);
          }
        }
      },
      2: {
        match: {
          channels: (c) => {
            return c.includes(2);
          }
        }
      },
      3: {
        match: {
          channels: (c) => {
            return c.includes(3);
          }
        }
      },
      4: {
        match: {
          channels: (c) => {
            return c.includes(4);
          }
        }
      }
    }
  };
}

class Tx118sa4 extends Ev1527Device {
  constructor(options = {}) {
    const {
      id = null,
      server = null
    } = options;

    if (!id || !server) {
      throw new Error('insufficient options provided');
    }

    super({
      id,
      server,
      match: makeMatchOptions(id)
    });

    this._tx118sa4 = {};

    this.log.friendlyName(id);
    this._tx118sa4.log = this.log.withPrefix(libName);
  }
}

module.exports = {
  Tx118sa4
};
