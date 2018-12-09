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
      text: `*SECURITY*\n\n${message}`,
      markdown: true
    });
  }

  addElement(name) {
    return (text) => {
      if (!this.armed) return;

      this._log.notice({
        head: 'triggered',
        attachment: `${name}: ${text}`
      });

      this._telegram(`_${name}_\n${text}`);

      this.emit('change');
    };
  }

  arm(active) {
    if (this.armed === active && !this._armDelay) return;

    this.armed = active;

    if (!active) {
      this.triggered = false;

      if (this._armDelay) {
        clearTimeout(this._armDelay);
        this._armDelay = undefined;
      }
    }

    this._log.info({
      head: 'active',
      value: active
    });

    this._telegram(`${active ? 'aktiv' : 'nicht aktiv'}`);

    this.emit('change');
  }

  delayedArm() {
    if (this.armed || this._armDelay) return;

    this._log.info('delayed activation');

    this._telegram(`arming in ${armDelay / 1000} seconds`);

    this._armDelay = setTimeout(() => {
      this.arm(true);
    }, armDelay);
  }

  toggle() {
    if (this.armed || this._armDelay) {
      this.arm(false);
      return;
    }

    this.delayedArm();
  }
}

module.exports = {
  Security
};
