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
const { levelNames, globalPrefix } = require('./config.json');

const { PROD_ENV: isProd, LOG_LEVEL } = process.env;
const logLevel = Number(LOG_LEVEL);

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
  static NAME(libName, instanceName) {
    return `${libName} → ${instanceName}`;
  }

  constructor(name) {
    this._name = name;

    this._defaultFields = {
      syslog_identifier: globalPrefix,
      NAME: name
    };

    this._journal = (
      isLinux
        ? new Journald(this._defaultFields)
        : null
    );

    this._telegramChat = new TelegramChat(chatIds.log);

    this.info('instance created');
  }

  _log(opts) {
    const {
      _name,
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

    if (level > logLevel) return;

    const messageBody = (
      `${head}${value === null ? '' : ` = ${value}`}`
    );
    const messageAttachment = (
      `${attachment === null ? '' : `:\n${indent(attachment)}`}`
    );
    const message = (
      `${_name}:\n${messageBody}${messageAttachment}`
    );

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
        default:
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
      }
    } else {
      console.log(`\n[${levelName}]\n${message}\n`);
    }

    if (
      telegram === true
      || (telegram !== false && level <= 3)
    ) {
      _telegramChat.send(
        `*${levelName}*  \n_${_name}_  \n${messageBody}\`${messageAttachment}\``
      );
    }
  }

  debug(opts) {
    this._log(options(7, opts));
  }

  info(opts) {
    this._log(options(6, opts));
  }

  notice(opts) {
    this._log(options(5, opts));
  }

  warning(opts) {
    this._log(options(4, opts));
  }

  error(opts) {
    this._log(options(3, opts));
  }

  critical(opts) {
    this._log(options(2, opts));
  }

  alert(opts) {
    this._log(options(1, opts));
  }

  emerg(opts) {
    this._log(options(0, opts));
  }
}

module.exports = {
  Logger
};
