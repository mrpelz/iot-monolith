/* eslint-disable no-console */
const { chatIds, TelegramChat } = require('../telegram');
const { parseString } = require('../utils/string');

const { PROD_ENV, LOG_LEVEL, LOG_TELEGRAM } = process.env;
const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
const logLevel = parseString(LOG_LEVEL);
const logTelegram = LOG_TELEGRAM ? Boolean(parseString(LOG_TELEGRAM)) : true;

const telegramLogLevel = 3;
const levelNames = [
  'EMERG',
  'ALERT',
  'CRITICAL',
  'ERROR',
  'WARNING',
  'NOTICE',
  'INFO',
  'DEBUG'
];


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

    this._telegramChat = new TelegramChat(chatIds.log);
  }

  _log(opts, usedPrefix) {
    const {
      _name,
      _prefixes,
      _telegramChat
    } = this;

    const {
      level,
      head,
      value = null,
      attachment = null,
      telegram = null
    } = opts;

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

    const levelName = level === null ? '_' : levelNames[level];

    if (level <= logLevel) {
      if (isProd) {
        console.log(`[${levelName}] ${[
          _prefixes[0] || null,
          name,
          messageBody
        ].filter(Boolean).join(' | ')}`);
      } else {
        console.log(`\n[${levelName}]\n${[
          name,
          prefixChain.length ? prefixChain : null,
          messageBody,
          messageAttachment
        ].filter(Boolean).join('\n')}\n`);
      }
    }

    if (!logTelegram) return;

    if (
      telegram === true
      || (telegram !== false && level <= telegramLogLevel)
    ) {
      setImmediate(() => {
        _telegramChat.send(
          [
            `*${levelName}*`,
            `_${name}_`,
            `\`${prefixChain}\``,
            messageBody || null,
            messageAttachment ? `\`${messageAttachment}\`` : null
          ].filter(Boolean).join('  \n')
        ).catch((error) => {
          console.error(`error logging to telegram: "${error}"`);
        });
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
