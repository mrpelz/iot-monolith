const EventEmitter = require('events');
const { sanity } = require('../utils/data');
const { rebind, resolveAlways } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'hmi';

class HmiServer extends EventEmitter {
  constructor() {
    super();

    this._hmi = {
      getters: [],
      setters: {},
      ingests: []
    };

    rebind(this, '_getAllElementStates', '_setElementState');

    this._hmi.log = new Logger(`${libName} (server)`);
  }

  _pushElementStateToServices(name, attributes, value) {
    const {
      ingests,
      log
    } = this._hmi;

    Promise.all(
      ingests.map((ingest) => {
        return resolveAlways(ingest({
          name,
          attributes,
          value
        }));
      })
    ).then(() => {
      log.info('pushed state to all ingests');
    });
  }

  _getAllElementStates(force) {
    const {
      log,
      getters
    } = this._hmi;

    return Promise.all(
      getters.map((getter) => {
        return getter(force);
      })
    ).then((values) => {
      log.info('updated all elements');
      return values;
    });
  }

  _setElementState(name, value) {
    const {
      log,
      setters
    } = this._hmi;

    if (!name || value === undefined) {
      throw new Error('insufficient options provided');
    }

    log.info(`setting "${name}" to "${value}"`);

    const { [name]: set } = setters;
    return set ? set(value) : Promise.resolve(null);
  }

  addElement(options) {
    const {
      getters,
      setters
    } = this._hmi;

    const {
      name,
      attributes,
      get,
      set
    } = options;

    if (!name || !attributes || !get) {
      throw new Error('insufficient options provided');
    }

    const getter = async (force) => {
      const result = await get(force);
      if (result === null) return null;

      this._pushElementStateToServices(name, attributes, result);

      return result;
    };

    const setter = async (input) => {
      const result = await set(input);
      getter();

      return result;
    };

    getters.push(getter);

    if (set) {
      setters[name] = setter;
    }

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
      set: this._setElementState
    };
  }

  // Public methods:
  // addElement
  // addService
}

class HmiElement {
  constructor(options = {}) {
    const {
      name = null,
      handlers = null,
      sanity: valueSanity = null,
      attributes = {},
      server = null
    } = options;

    if (!name || !handlers || !attributes || !server) {
      throw new Error('insufficient options provided');
    }

    const {
      get = null,
      set = null
    } = handlers;

    if (!get) {
      throw new Error('no getHandler provided');
    }

    this._hmiElement = {
      name,
      attributes,
      valueSanity,
      get,
      set,
      server,
      oldValue: null
    };

    rebind(this, '_get', '_set');
    this._setUpServer();

    this._hmiElement.log = new Logger(`${libName} (element)`);
  }

  _setUpServer() {
    const {
      name,
      attributes,
      set,
      server
    } = this._hmiElement;

    const update = server.addElement({
      name,
      attributes,
      get: this._get,
      set: typeof set !== 'function' ? null : this._set
    });

    this._hmiElement.update = update;
  }

  async _get(force = false) {
    const {
      get,
      log,
      name,
      valueSanity,
      oldValue
    } = this._hmiElement;

    const result = await resolveAlways(get());
    const value = valueSanity ? sanity(result, valueSanity) : result;

    if (!force && value === oldValue) return null;

    log.info({
      head: `got new value for "${name}"`,
      value
    });

    this._hmiElement.oldValue = value;

    return value;
  }

  _set(input) {
    const {
      log,
      name,
      set
    } = this._hmiElement;

    if (typeof set !== 'function') {
      return Promise.reject(new Error('element not settable'));
    }

    log.info({
      head: `setting "${name}"`,
      value: input
    });

    return set(input);
  }

  update() {
    const {
      log,
      name,
      update
    } = this._hmiElement;

    log.info(`force-updating "${name}"`);

    return update(true);
  }

  // Public methods:
  // update
}

module.exports = {
  HmiServer,
  HmiElement
};
