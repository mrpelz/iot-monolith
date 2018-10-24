const EventEmitter = require('events');
const { sanity } = require('../utils/math');
const { rebind, resolveAlways } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'hmi';

class HmiServer {
  constructor() {
    this._hmi = {
      elements: {},
      ingests: [],
    };

    rebind(this, '_getAllElementStates', '_listElements', '_setElementState');

    const log = new Logger();
    log.friendlyName('HmiServer');
    this._hmi.log = log.withPrefix(libName);
  }

  _pushElementStateToServices(name, value) {
    const {
      ingests,
      log
    } = this._hmi;

    Promise.all(
      ingests.map((ingest) => {
        return resolveAlways(ingest({
          name,
          value
        }));
      })
    ).then(() => {
      log.info('pushed state to all ingests');
    });
  }

  _getAllElementStates() {
    const {
      elements,
      log
    } = this._hmi;

    return Promise.all(
      Object.values(elements).map((element) => {
        const { getter } = element;

        if (!getter) {
          return Promise.resolve(null);
        }

        return getter();
      })
    ).then(() => {
      log.info('updated all elements');
    });
  }

  _listElements(includeValues = false) {
    const {
      log,
      elements
    } = this._hmi;

    return Promise.all(
      Object.values(elements).map((element) => {
        const { lister } = element;

        return lister(includeValues);
      })
    ).then((values) => {
      log.info('got all elements list');

      return values;
    });
  }

  _setElementState(name, value) {
    const {
      log,
      elements
    } = this._hmi;

    if (value === undefined) {
      throw new Error('insufficient options provided');
    }

    if (!Object.keys(elements).includes(name)) {
      return Promise.reject(new Error('service not known'));
    }

    log.info(`setting "${name}" to "${value}"`);

    const { [name]: { setter } } = elements;
    return setter ? setter(value) : Promise.resolve(null);
  }

  addElement(options) {
    const {
      elements
    } = this._hmi;

    const {
      name,
      attributes,
      get,
      set
    } = options;

    if (!name || !attributes || !(get || set)) {
      throw new Error('insufficient options provided');
    }

    const getter = async () => {
      const result = await get();
      if (result === null) return;

      this._pushElementStateToServices(name, result);
    };

    const lister = async (includeValues) => {
      const value = includeValues
        ? await get(true)
        : null;

      return {
        name,
        attributes,
        value
      };
    };

    const setter = (input) => {
      return set(input);
    };

    elements[name] = {
      getter: get ? getter : null,
      lister,
      setter: set ? setter : null
    };

    return getter;
  }

  addService(ingest) {
    const {
      ingests
    } = this._hmi;

    if (!ingest) {
      throw new Error('insufficient options provided');
    }

    ingests.push(ingest);

    return {
      getAll: this._getAllElementStates,
      set: this._setElementState,
      list: this._listElements
    };
  }

  // Public methods:
  // addElement
  // addService
}

class HmiElement extends EventEmitter {
  constructor(options = {}) {
    const {
      attributes = {},
      getter = null,
      name = null,
      sanity: valueSanity = null,
      server = null,
      settable = false
    } = options;

    if (!name || !attributes || !server || !(getter || settable)) {
      throw new Error('insufficient options provided');
    }

    super();

    this._hmiElement = {
      name,
      attributes: Object.assign(
        {
          get: typeof getter === 'function',
          set: settable
        },
        attributes
      ),
      valueSanity,
      getter,
      settable,
      server,
      oldValue: null
    };

    rebind(this, '_get', '_set');
    this._setUpServer();

    const log = new Logger();
    log.friendlyName(name);
    this._hmiElement.log = log.withPrefix(libName);
  }

  _setUpServer() {
    const {
      name,
      attributes,
      getter,
      settable,
      server
    } = this._hmiElement;

    const update = server.addElement({
      name,
      attributes,
      get: typeof getter === 'function' ? this._get : null,
      set: settable ? this._set : null
    });

    this._hmiElement.update = update;
  }

  async _get(force = false) {
    const {
      getter,
      log,
      valueSanity,
      oldValue
    } = this._hmiElement;

    const result = await resolveAlways(getter());
    const value = valueSanity ? sanity(result, valueSanity) : result;

    if (!force && value === oldValue) return null;

    log.info({
      head: 'got new value',
      value
    });

    this._hmiElement.oldValue = value;

    return value;
  }

  _set(input) {
    const {
      log,
      settable
    } = this._hmiElement;

    if (!settable) {
      throw new Error('element not settable');
    }

    log.info({
      head: 'setting',
      value: input
    });

    this.emit('set', input);
  }

  update() {
    const {
      log,
      update
    } = this._hmiElement;

    log.info('force-updating');

    return update();
  }

  // Public methods:
  // update
}

module.exports = {
  HmiServer,
  HmiElement
};
