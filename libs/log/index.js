/* eslint-disable no-console */
/* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": true}] */
const { platform } = require('os');

const isLinux = (platform() === 'linux');

const Journald = (
  isLinux
    ? require('systemd-journald')
    : null
);

const { chatIds, TelegramChat } = require('../telegram');

const {
  levelNames
} = require('./config.json');

const { PROD_ENV: isProd } = process.env;

class Logger {
  constructor(appName = '') {
    this._appName = appName;

    this._defaultFields = {
      syslog_identifier: this._appName
    };

    this._journal = (
      isLinux
        ? new Journald(this._defaultFields)
        : null
    );

    this._telegramChat = new TelegramChat(chatIds.log);
  }

  log(message = '', level = 6, addnFields = {}) {
    const {
      _appName,
      _defaultFields,
      _journal,
      _telegramChat
    } = this;

    const name = levelNames[level];

    if (isProd && _journal) {
      const fields = Object.assign({}, _defaultFields, addnFields);

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
      console.log(`[${name}] ${_appName}: ${message}`);
    }

    if (level <= 3) {
      _telegramChat.send(`_${name}_  \n${message}`);
    }
  }
}

module.exports = {
  Logger
};
