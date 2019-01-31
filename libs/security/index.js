const EventEmitter = require('events');
const { Logger } = require('../log');

const libName = 'security';

const armDelay = 30000;

class Security extends EventEmitter {
  constructor(options = {}) {
    const {
      telegram
    } = options;

    super();

    this.armed = false;
    this.triggered = false;
    this.armDelay = undefined;

    (async () => {
      const client = await telegram.client;
      this._chat = await client.addChat(telegram.chatIds.iot);
    })();

    const log = new Logger();
    log.friendlyName('Security');
    this._log = log.withPrefix(libName);
  }

  _telegram(message) {
    if (!this._chat) return;

    this._chat.addMessage({
      text: `*SECURITY*\n${message}`,
      markdown: true
    });
  }

  addElement(name) {
    let lastState;

    return (state, text) => {
      if (
        !this.armed
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

  arm(active) {
    if (this.armed === active && !this.armDelay) return;

    this.armed = active;

    if (!active) {
      this.triggered = false;

      if (this.armDelay) {
        clearTimeout(this.armDelay);
        this.armDelay = undefined;
      }
    }

    this._log.info({
      head: 'active',
      value: active
    });

    this._telegram(`${active ? 'aktiv' : 'inaktiv'}`);

    this.emit('change');
  }

  delayedArm() {
    if (this.armed || this.armDelay) return;

    this._log.info('delayed activation');

    this._telegram(`Aktivierung in ${armDelay / 1000} Sekunden`);

    this.armDelay = setTimeout(() => {
      this.arm(true);
    }, armDelay);

    this.emit('change');
  }

  toggle() {
    if (this.armed || this.armDelay) {
      this.arm(false);
      return;
    }

    this.delayedArm();
  }
}

module.exports = {
  Security
};
