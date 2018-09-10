const EventEmitter = require('events');
const { rebind, resolveAlways } = require('../utils/oop');
const { RecurringMoment } = require('../utils/time');
const { Logger } = require('../log');

const libName = 'hmi';
class Hmi extends EventEmitter {
  constructor(options) {
    const {
      scheduler,
    } = options;

    if (!scheduler) {
      throw new Error('insufficient options provided');
    }

    super();

    this._hmi = {
      isActive: false,
      hasListeners: false,
      scheduler
    };

    rebind(this, '_onListenerChange', '_handleRefresh');

    this.on('newListener', this._onListenerChange);
    this.on('removeListener', this._onListenerChange);

    this._hmi.log = new Logger(libName);
  }

  _onListenerChange() {
    this._hmi.hasListeners = Boolean(this.listenerCount('change'));
  }

  _publish(id, attributes, value) {
    this.emit('change', {
      id,
      attributes,
      value
    });
  }

  _handleRefresh() {
    const { elements, log } = this._hmi;

    log.debug('getting element values');
    Object.values(elements).forEach((getter) => {
      getter();
    });
  }

  start() {
    const { isActive, log } = this._hmi;

    if (isActive === true) {
      return;
    }

    log.info({
      head: 'set active',
      value: true
    });

    this._hmi.isActive = true;
  }

  stop() {
    const { isActive, log } = this._hmi;

    if (isActive === false) {
      return;
    }

    log.info({
      head: 'set active',
      value: false
    });

    this._hmi.isActive = false;
  }

  element(id, handler, attributes = {}, refresh) {
    if (!id || !handler || !attributes) {
      throw new Error('insufficient options provided');
    }

    const { log, scheduler } = this._hmi;

    let oldValue;

    log.info(`add element "${id}"`);

    const update = (result) => {
      if (result === null) return null;

      const hasUpdated = oldValue !== result;
      if (!hasUpdated) return undefined;

      oldValue = result;

      this._publish(
        id,
        attributes,
        result
      );

      return result;
    };

    if (refresh) {
      const getter = () => {
        resolveAlways(handler()).then((value) => {
          log.debug({
            head: `got metric "${id}"`,
            value
          });

          update(value);

          return value;
        });
      };

      const recurring = new RecurringMoment(scheduler, refresh);

      recurring.on('hit', () => {
        if (!this._hmi.isActive || this._hmi.hasListeners) return;
        getter();
      });
    }

    return {
      update
    };
  }
}

module.exports = {
  Hmi
};
