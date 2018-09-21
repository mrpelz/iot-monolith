const { Ev1527Device } = require('../ev1527');
const { Logger } = require('../log');

const libName = 'tx118sa4';

function makeMatchOptions(id) {
  return {
    device: {
      match: {
        model: 'TX118SA-4',
        id
      },
      debounce: 1000
    },
    states: {
      one: {
        match: {
          channels: (c) => {
            return c.includes(1);
          }
        }
      },
      two: {
        match: {
          channels: (c) => {
            return c.includes(2);
          }
        }
      },
      three: {
        match: {
          channels: (c) => {
            return c.includes(3);
          }
        }
      },
      four: {
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
    this._tx118sa4.log = new Logger(Logger.NAME(libName, id));
  }
}

module.exports = {
  Tx118sa4
};
