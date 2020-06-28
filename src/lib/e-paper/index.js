import { RecurringMoment, every } from '../utils/time.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { Logger } from '../log/index.js';
import { post } from '../http/client.js';

const libName = 'e-paper';

export class EPaper {
  constructor(options = {}) {
    const {
      hmiServer = null,
      meta = {},
      scheduler = null,
      update = null,
      updateOffset = 0,
      url
    } = options;

    if (!url || !hmiServer || !scheduler || !update) {
      throw new Error('insufficient options provided');
    }

    this._ePaper = {
      meta,
      url,
      isActive: false
    };

    rebind(this, '_postValues');

    this._setUpHmiService(hmiServer, scheduler, update, updateOffset);

    const log = new Logger();
    log.friendlyName(`ePaper (${url})`);
    this._ePaper.log = log.withPrefix(libName);
  }

  _setUpHmiService(hmiServer, scheduler, update, updateOffset) {
    const hmiService = hmiServer.addService(this._handleIngest);
    this._ePaper.hmiService = hmiService;

    new RecurringMoment(
      {
        scheduler,
        offset: updateOffset
      },
      every.parse(update)
    ).on('hit', this._postValues);
  }

  _postValues() {
    const {
      hmiService,
      isActive,
      log,
      meta,
      url
    } = this._ePaper;

    if (!isActive) return;

    hmiService.list(true).then((response = []) => {
      const values = response.reduce(
        (acc, { name, value }) => {
          acc[name] = value;
          return acc;
        },
        {}
      );

      const data = Object.assign({ values }, meta);
      return Buffer.from(JSON.stringify(data, null, null));
    }).catch(() => {
      return null;
    }).then((payload) => {
      if (!payload) return;

      resolveAlways(post(url, payload).catch((reason) => {
        log.error({
          head: 'error while posting to PHP-script',
          attachment: reason
        });
      }));
    });
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
