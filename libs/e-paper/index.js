const { post } = require('../http/client');
const { rebind, resolveAlways } = require('../utils/oop');
const { every, RecurringMoment } = require('../utils/time');
const { Logger } = require('../log');

const libName = 'e-paper';

const meta = {
  draw: [
    {
      device: 'test',
      template: 'room',
      lockLevel: 0,
      lockTime: 60000
    }
  ]
};

class EPaper {
  constructor(options = {}) {
    const {
      url,
      hmiServer = null,
      scheduler = null,
      update = null
    } = options;

    if (!url || !hmiServer || !scheduler || !update) {
      throw new Error('insufficient options provided');
    }

    this._ePaper = {
      url,
      isActive: false
    };

    rebind(this, '_postValues');

    this._setUpHmiService(hmiServer, scheduler, update);

    const log = new Logger();
    log.friendlyName(`ePaper (${url})`);
    this._ePaper.log = log.withPrefix(libName);
  }

  _setUpHmiService(hmiServer, scheduler, update) {
    const hmiService = hmiServer.addService(this._handleIngest);
    this._ePaper.hmiService = hmiService;

    new RecurringMoment(
      scheduler,
      every.parse(update)
    ).on('hit', this._postValues);
  }

  _postValues() {
    const {
      hmiService,
      isActive,
      url
    } = this._ePaper;

    if (!isActive) return;

    const payload = hmiService.list(true).then((response = []) => {
      const elements = response.reduce(
        (acc, { name, value }) => {
          acc[name] = value;
          return acc;
        },
        {}
      );

      const data = Object.assign({}, elements, meta);
      return Buffer.from(JSON.stringify(data, null, null));
    });

    if (!payload) return;

    resolveAlways(post(url, payload));
  }

  start() {
    if (!this._ePaper.isActive) {
      this._ePaper.isActive = true;
      this._postValues();
    }
  }

  stop() {
    if (this._ePaper.isActive) {
      this._ePaper.isActive = false;
    }
  }
}

module.exports = {
  EPaper
};
