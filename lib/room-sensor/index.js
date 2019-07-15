const { MessageClient } = require('../messaging');
const { CachePromise } = require('../cache');
const { readNumber, bufferToBoolean } = require('../utils/data');
const { arraysToObject } = require('../utils/structures');
const { resolveAlways } = require('../utils/oop');
const { sanity } = require('../utils/math');
const { sleep } = require('../utils/time');

const libName = 'room-sensor';

const metricOptions = {
  temperature: {
    head: 1,
    bytes: 2,
    sanity: {
      offset: -4000,
      divide: 100,
      max: 10000,
      min: 0
    },
    cache: 1000
  },
  pressure: {
    head: 2,
    bytes: 4,
    sanity: {
      divide: 100
    },
    cache: 1000
  },
  humidity: {
    head: 3,
    bytes: 2,
    sanity: {
      divide: 100
    },
    cache: 1000
  },
  brightness: {
    head: 4,
    bytes: 4,
    sanity: {
      divide: 100
    },
    cache: 1000
  },
  eco2: {
    head: 5,
    bytes: 2,
    cache: 1000,
    leadIn: 15000
  },
  tvoc: {
    head: 6,
    bytes: 2,
    cache: 1000,
    leadIn: 15000
  },
  movement: {
    head: 7,
    bytes: 1,
    event: true,
    request: false
  },
  pm025: {
    head: 8,
    bytes: 4,
    sanity: {
      divide: 1000
    },
    cache: 60000,
    timeout: 15000,
    request: false,
    tolerateNull: true
  },
  pm10: {
    head: 9,
    bytes: 4,
    sanity: {
      divide: 1000
    },
    cache: 60000,
    timeout: 15000,
    request: false,
    tolerateNull: true
  },
  co2: {
    head: 10,
    bytes: 2,
    cache: 1000,
    leadIn: 180000,
    tolerateNull: true
  },
  temperature2: {
    head: 11,
    bytes: 2,
    sanity: {
      offset: -4000,
      divide: 100,
      max: 10000,
      min: 0
    },
    cache: 1000
  },
  co: {
    head: 12,
    bytes: 4,
    sanity: {
      divide: 1000
    },
    cache: 300000,
    leadIn: 300000,
    timeout: 60000,
    request: false
  }
};

function prepareMetricHandlers(metrics) {
  const state = new Map();

  const types = metrics.map((name) => {
    const { [name]: options } = metricOptions;

    const {
      bytes,
      event,
      head,
      sanity: sanityOptions = {},
      timeout,
      tolerateNull
    } = options;

    const parser = (input) => {
      if (!input.length) {
        if (tolerateNull) {
          return null;
        }

        throw new Error('received null value');
      }

      const result = (bytes > 1)
        ? sanity(readNumber(input, bytes), sanityOptions)
        : bufferToBoolean(input);

      state.set(name, result);

      return result;
    };

    const eventParser = event ? (input) => {
      if (!input.length) return undefined;

      const payload = input.slice(1);
      if (!payload.length) return undefined;

      const result = (bytes > 1)
        ? sanity(readNumber(payload, bytes), sanityOptions)
        : bufferToBoolean(payload);

      state.set(name, result);

      return result;
    } : undefined;

    return {
      name,
      eventName: event ? name : undefined,
      eventParser,
      head: Buffer.from([head]),
      parser,
      timeout
    };
  });

  return {
    state,
    types
  };
}

function getCaches(metrics) {
  return arraysToObject(
    metrics,
    metrics.map((name) => {
      const {
        [name]: {
          cache = 0,
          timeout = 1000
        } = {}
      } = metricOptions;

      if (!cache) return null;
      return new CachePromise(cache + timeout);
    })
  );
}

class RoomSensor extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      metrics = []
    } = options;

    if (!host || !port || !metrics.length) {
      throw new Error('insufficient options provided');
    }

    const { state, types } = prepareMetricHandlers(metrics);

    super({
      host,
      port,
      messageTypes: types
    });

    this._roomSensor = {
      metrics,
      caches: getCaches(metrics),
      state
    };

    this.log.friendlyName(`${host}:${port}`);
    this._roomSensor.log = this.log.withPrefix(libName);
  }

  requestMetric(metric) {
    const {
      state: {
        isConnected,
        connectionTime
      }
    } = this._reliableSocket;

    const {
      log,
      caches
    } = this._roomSensor;

    if (!isConnected) {
      return Promise.reject(new Error('sensor not connected'));
    }

    const { [metric]: cache } = caches;
    const {
      [metric]: {
        leadIn = 0
      } = {}
    } = metricOptions;

    const isLeadIn = Date.now() < (connectionTime + leadIn);

    if (cache) {
      if (cache.hit()) {
        return cache.defer();
      }

      return cache.promise(this.request(metric, undefined, isLeadIn)).catch((reason) => {
        log.error({
          head: `metric [cached] (${metric}) error`,
          attachment: reason
        });

        throw reason;
      });
    }

    return this.request(metric, undefined, isLeadIn).catch((reason) => {
      log.error({
        head: `metric [uncached] (${metric}) error`,
        attachment: reason
      });

      throw reason;
    });
  }

  getMetric(metric, timeout = null) {
    const {
      metrics
    } = this._roomSensor;

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const {
      [metric]: {
        cache = 0,
        request = true
      } = {}
    } = metricOptions;

    const fallback = cache ? this.getCache(metric) : this.getState(metric);

    if (!request) {
      return Promise.resolve(fallback);
    }

    if (timeout) {
      return Promise.race([
        this.requestMetric(metric),
        sleep(timeout, fallback)
      ]);
    }

    return this.requestMetric(metric);
  }

  getCache(metric) {
    const {
      metrics,
      caches
    } = this._roomSensor;

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const { [metric]: cache } = caches;

    if (!cache) return null;

    return cache.value;
  }

  getState(metric) {
    return this._roomSensor.state.get(metric);
  }

  getMetricTime(metric) {
    const {
      metrics,
      caches
    } = this._roomSensor;

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const { [metric]: cache } = caches;

    return cache ? cache.resultTime : null;
  }

  getAll() {
    const {
      state: {
        isConnected
      }
    } = this._reliableSocket;

    const {
      log,
      metrics
    } = this._roomSensor;

    if (!isConnected) {
      return Promise.reject(new Error('sensor not connected'));
    }

    return Promise.all(metrics.map((metric) => {
      return resolveAlways(this.getMetric(metric));
    })).then((values) => {
      return arraysToObject(metrics, values);
    }).catch((reason) => {
      log.error({
        head: 'getAll error',
        attachment: reason
      });

      throw reason;
    });
  }

  getTemperature() {
    return this.getMetric('temperature');
  }

  getTemperature2() {
    return this.getMetric('temperature2');
  }

  getPressure() {
    return this.getMetric('pressure');
  }

  getHumidity() {
    return this.getMetric('humidity');
  }

  getBrightness() {
    return this.getMetric('brightness');
  }

  getEco2() {
    return this.getMetric('eco2');
  }

  getTvoc() {
    return this.getMetric('tvoc');
  }

  getPm025() {
    return this.getMetric('pm025');
  }

  getPm10() {
    return this.getMetric('pm10');
  }

  getCo2() {
    return this.getMetric('co2');
  }

  getMovement() {
    return this.getMetric('movement');
  }

  // Public methods:
  // connect (inherited from PersistenSocket)
  // disconnect (inherited from PersistenSocket)
  // access (inherited from Base)
  // requestMetric
  // getMetric
  // getCache
  // getState
  // getMetricTime
  // getAll
  // getTemperature
  // getTemperature2
  // getPressure
  // getHumidity
  // getBrightness
  // getEco2
  // getTvoc
  // getPm025
  // getPm10
  // getCo2
  // getMovement
}

module.exports = {
  RoomSensor
};
