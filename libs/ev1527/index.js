const { PersistentSocket } = require('../tcp');
const { rebind } = require('../utils/oop');
const { camel } = require('../utils/string');
const { Logger } = require('../log');

const libName = 'ev1527';

const apiDelimiter = 0x0a;
const apiEncoding = 'utf8';

class Ev1527 extends PersistentSocket {
  static DOOR_SENSOR(name, id) {
    const match = (cmd) => {
      let lastMatch = 0;

      return (input) => {
        const now = new Date().getTime();

        const isMatch = (
          input.model === 'Generic Remote'
          && input.id === id
          && input.cmd === cmd
          && now - lastMatch > 1100
        );

        if (isMatch) {
          lastMatch = now;
        }

        return isMatch;
      };
    };

    return [
      {
        name: camel(name, 'closed'),
        match: match(14)
      },
      {
        name: camel(name, 'open'),
        match: match(10)
      },
      {
        name: camel(name, 'tampered'),
        match: match(7)
      }
    ];
  }

  static TX118SA4(name, id) {
    const match = (channel) => {
      let lastMatch = 0;

      return (input) => {
        const now = new Date().getTime();

        const isMatch = (
          input.model === 'TX118SA-4'
          && input.id === id
          && input.channels.includes(channel)
          && now - lastMatch > 1100
        );

        if (isMatch) {
          lastMatch = now;
        }

        return isMatch;
      };
    };

    return [
      {
        name: camel(name, 'One'),
        match: match(1)
      },
      {
        name: camel(name, 'Two'),
        match: match(2)
      },
      {
        name: camel(name, 'Three'),
        match: match(3)
      },
      {
        name: camel(name, 'Four'),
        match: match(4)
      }
    ];
  }

  constructor(options) {
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

    this._ev1527 = {
      triggers: []
    };

    rebind(this, '_handleMessage');
    this.on('data', this._handleMessage);

    this._ev1527.log = new Logger(Logger.NAME(libName, `${host}:${port}`));
  }

  _handleMessage(input) {
    const { log, triggers } = this._ev1527;
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
      const matched = triggers.filter((trigger) => {
        return trigger.match(data);
      });

      matched.forEach((trigger) => {
        this.emit('hit', trigger.name, data);
        this.emit(trigger.name);
      });
    }
  }

  trigger(...matches) {
    if (!matches.length) {
      throw new Error('insufficient options provided');
    }

    const { log, triggers } = this._ev1527;

    triggers.push(...matches.map((trigger) => {
      const { name, match } = trigger;

      log.info(`add trigger "${name}"`);

      return {
        name,
        match
      };
    }));
  }

  // Public methods:
  // connect
  // disconnect
  // trigger
}

module.exports = {
  Ev1527
};
