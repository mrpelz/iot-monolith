const EventEmitter = require('events');
const { Logger } = require('../log');
const { Timer } = require('../utils/time');

const libName = 'security';

const armDelay = 30000;
const defaultLevel = 1;
const allowedLevels = [0, 1];

class Security extends EventEmitter {
  constructor(options = {}) {
    const {
      telegram
    } = options;

    super();

    this.armed = false;
    this.level = defaultLevel;
    this.triggered = false;

    (async () => {
      const client = await telegram.client;
      this._chat = await client.addChat(telegram.chatIds.iot);
    })();

    this.timer = new Timer(armDelay);

    const log = new Logger();
    log.friendlyName('Security');
    this._log = log.withPrefix(libName);

    this.timer.on('hit', () => {
      this.arm(true, this.level);
    });
  }

  get armDelay() {
    return this.timer.isRunning;
  }

  _telegram(message) {
    if (!this._chat) return;

    this._chat.addMessage({
      text: `*SECURITY*\n${message}`,
      markdown: true
    });
  }

  addElement(name, level = 0) {
    let lastState;

    return (state, text) => {
      if (
        !this.armed
        || level > this.level
        || (
          state !== undefined
          && state === lastState
        )
      ) return;

      this.triggered = true;

      this._log.notice({
        head: 'triggered',
        value: state,
        attachment: `${name}: ${text}`
      });

      this._telegram(`_${name}_\n${text}`);

      this.emit('change');
    };
  }

  arm(active, level = defaultLevel) {
    if (!allowedLevels.includes(level)) {
      throw new Error('illegal security level used');
    }

    this.armed = active;
    this.level = level;

    if (!active) {
      this.triggered = false;
    }

    this._log.info({
      head: 'active',
      value: active
    });

    this._telegram(`${active ? 'aktiv' : 'inaktiv'}`);

    if (active) {
      this._log.info({
        head: 'level',
        value: this.level
      });

      this._telegram(`level ${level}`);
    }

    this.emit('change');
  }

  delayedArm(level = defaultLevel) {
    if (!allowedLevels.includes(level)) {
      throw new Error('illegal security level used');
    }
    if (this.armed || this.armDelay) return;

    this.level = level;

    this._log.info('delayed activation');
    this._telegram(`Aktivierung in ${armDelay / 1000} Sekunden`);

    this.timer.start();

    this.emit('change');
  }

  toggle(level) {
    if (this.armed || this.armDelay) {
      this.timer.stop();
      this.arm(false, level);
      return;
    }

    this.delayedArm(level);
  }
}

module.exports = {
  Security
};