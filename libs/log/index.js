/* eslint-disable no-console */
/* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": true}] */
const { platform } = require('os');

const isLinux = (platform() === 'linux');

const Journald = (
  isLinux
    /* eslint-disable-next-line import/no-unresolved */
    ? require('systemd-journald')
    : null
);

const { chatIds, TelegramChat } = require('../telegram');
const { parseString } = require('../utils/string');
const { levelNames, globalPrefix } = require('./config.json');

const { PROD_ENV, LOG_LEVEL, LOG_TELEGRAM } = process.env;
const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
const logLevel = parseString(LOG_LEVEL);
const logTelegram = LOG_TELEGRAM ? Boolean(parseString(LOG_TELEGRAM)) : true;

function options(level, input) {
  return Object.assign(
    (typeof input === 'string' ? {
      head: input
    } : input),
    {
      level
    }
  );
}

function indent(input) {
  const text = typeof input === 'string'
    ? input
    : input.toString();

  return text.split('\n').map((line) => {
    return `  ${line}`;
  }).join('\n');
}

class Logger {
  constructor(name = null) {
    this._name = name;
    this._prefixes = [];

    this._defaultFields = {
      syslog_identifier: globalPrefix
    };

    this._journal = (
      isLinux
        ? new Journald(this._defaultFields)
        : null
    );

    this._telegramChat = new TelegramChat(chatIds.log);
  }

  _log(opts, usedPrefix) {
    const {
      _name,
      _prefixes,
      _defaultFields,
      _journal,
      _telegramChat
    } = this;

    const {
      level,
      head,
      value = null,
      attachment = null,
      telegram = null
    } = opts;

    if (level !== null && level > logLevel) return;

    const name = _name || _prefixes[0] || '[unknown logger]';
    const prefixChain = _prefixes.map((prefix) => {
      if (prefix === usedPrefix) return `[${prefix}]`;
      return prefix;
    }).join(' → ');
    const messageBody = (
      `${head}${value === null ? '' : ` = ${value}`}`
    );
    const messageAttachment = (
      `${attachment === null ? '' : indent(attachment)}`
    );
    const message = [
      name,
      prefixChain.length ? prefixChain : null,
      messageBody,
      messageAttachment
    ].filter(Boolean).join('\n');

    const levelName = levelNames[level];

    if (isProd && _journal) {
      const fields = Object.assign({
        STATE: head,
        VALUE: value
      }, _defaultFields);

      switch (level) {
        case 7:
          _journal.debug(message, fields);
          break;
        case 6:
          _journal.info(message, fields);
          break;
        case 5:
          _journal.notice(message, fields);
          break;
        case 4:
          _journal.warning(message, fields);
          break;
        case 3:
          _journal.err(message, fields);
          break;
        case 2:
          _journal.crit(message, fields);
          break;
        case 1:
          _journal.alert(message, fields);
          break;
        case 0:
          _journal.emerg(message, fields);
          break;
        default:
      }
    } else {
      console.log(`\n[${levelName}]\n${message}\n`);
    }

    if (!logTelegram) return;

    if (
      telegram === true
      || (telegram !== false && level <= 3)
    ) {
      _telegramChat.send(
        `*${levelName || ''}*  \n_${name}_  \n\`${prefixChain}\`_  \n${messageBody}\`${messageAttachment}\``
      ).catch((error) => {
        console.error(`error logging to telegram: "${error}"`);
      });
    }
  }

  friendlyName(name) {
    if (name) {
      this._name = name;
    }
  }

  withPrefix(prefix) {
    this._prefixes.unshift(prefix);
    const self = this;

    class LocalLogger extends Logger {
      constructor() {
        return {
          telegram: (opts) => { self.telegram(opts, prefix); },
          debug: (opts) => { self.debug(opts, prefix); },
          info: (opts) => { self.info(opts, prefix); },
          notice: (opts) => { self.notice(opts, prefix); },
          warning: (opts) => { self.warning(opts, prefix); },
          error: (opts) => { self.error(opts, prefix); },
          critical: (opts) => { self.critical(opts, prefix); },
          alert: (opts) => { self.alert(opts, prefix); },
          emergency: (opts) => { self.emergency(opts, prefix); }
        };
      }
    }

    return new LocalLogger();
  }

  telegram(opts, prefix = null) {
    this._log(Object.assign({}, options(null, opts), {
      telegram: true
    }), prefix);
  }

  debug(opts, prefix = null) {
    this._log(options(7, opts), prefix);
  }

  info(opts, prefix = null) {
    this._log(options(6, opts), prefix);
  }

  notice(opts, prefix = null) {
    this._log(options(5, opts), prefix);
  }

  warning(opts, prefix = null) {
    this._log(options(4, opts), prefix);
  }

  error(opts, prefix = null) {
    this._log(options(3, opts), prefix);
  }

  critical(opts, prefix = null) {
    this._log(options(2, opts), prefix);
  }

  alert(opts, prefix = null) {
    this._log(options(1, opts), prefix);
  }

  emergency(opts, prefix = null) {
    this._log(options(0, opts), prefix);
  }
}

module.exports = {
  Logger
};
