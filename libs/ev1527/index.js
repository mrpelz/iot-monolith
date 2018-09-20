const EventEmitter = require('events');
const { PersistentSocket } = require('../tcp');
const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'ev1527';

const apiDelimiter = 0x0a;
const apiEncoding = 'utf8';

class Ev1527Server extends PersistentSocket {
  constructor(options = {}) {
    const {
      host = null,
      port = 9000
    } = options;

    if (!host || !port) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      delimiter: apiDelimiter
    });

    this._ev1527 = {};

    rebind(this, '_handlePayload');
    this.on('data', this._handlePayload);

    this._ev1527.log = new Logger(Logger.NAME(`${libName} (server)`, `${host}:${port}`));
  }

  _handlePayload(input) {
    const { log } = this._ev1527;
    const payload = input.toString(apiEncoding).trim();

    log.info({
      head: 'received payload',
      attachment: payload
    });

    let data;

    try {
      data = JSON.parse(payload);
    } catch (error) {
      log.warning({
        head: 'illegal string received',
        attachment: payload
      });
    }

    if (data) {
      this.emit('message', data);
    }
  }

  // Public methods:
  // connect
  // disconnect
}

class Ev1527Device extends EventEmitter {
  static DOOR_SENSOR(id) {
    const match = (cmd) => {
      let lastMatch = 0;

      return (message) => {
        const now = new Date().getTime();

        const isMatch = (
          message.model === 'Generic Remote'
          && message.id === id
          && message.cmd === cmd
          && now - lastMatch > 1500
        );

        if (isMatch) {
          lastMatch = now;
        }

        return isMatch;
      };
    };

    return [
      {
        state: 'close',
        match: match(14)
      },
      {
        state: 'open',
        match: match(10)
      },
      {
        state: 'tamper',
        match: match(7)
      }
    ];
  }

  static TX118SA4(id) {
    const match = (channel) => {
      let lastMatch = 0;

      return (message) => {
        const now = new Date().getTime();

        const isMatch = (
          message.model === 'TX118SA-4'
          && message.id === id
          && message.channels.includes(channel)
          && now - lastMatch > 1000
        );

        if (isMatch) {
          lastMatch = now;
        }

        return isMatch;
      };
    };

    return [
      {
        state: 'one',
        match: match(1)
      },
      {
        state: 'two',
        match: match(2)
      },
      {
        state: 'three',
        match: match(3)
      },
      {
        state: 'four',
        match: match(4)
      }
    ];
  }

  static prepareMatcher(matchFn, id) {
    const matchers = matchFn(id);

    return (message) => {
      return matchers.map((matchSet) => {
        const { state, match } = matchSet;

        const isMatch = match(message);

        return isMatch ? state : null;
      }).filter(Boolean);
    };
  }

  constructor(options = {}) {
    const {
      name = null,
      id = null,
      server = null,
      matchFn = null
    } = options;

    if (!name || !id || !server || typeof matchFn !== 'function') {
      throw new Error('insufficient options provided');
    }

    super();

    this._ev1527Device = {
      name
    };

    rebind(this, '_handleMessage');
    server.on('message', this._handleMessage);

    this._ev1527Device.matcher = Ev1527Device.prepareMatcher(matchFn, id);

    this._ev1527Device.log = new Logger(Logger.NAME(`${libName} (device)`, `${name}/${id}`));
  }

  _handleMessage(message) {
    const { matcher, name } = this._ev1527Device;

    const matches = matcher(message);

    matches.forEach((state) => {
      this.emit(state, name);
    });
  }
}

module.exports = {
  Ev1527Server,
  Ev1527Device
};
