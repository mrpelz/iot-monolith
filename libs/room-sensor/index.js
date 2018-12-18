const { MessageClient } = require('../messaging');
const { CachePromise } = require('../cache');
const { readNumber, bufferToBoolean } = require('../utils/data');
const { arraysToObject } = require('../utils/structures');
const { resolveAlways } = require('../utils/oop');
const { sanity } = require('../utils/math');

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
    cache: 1000
  },
  tvoc: {
    head: 6,
    bytes: 2,
    cache: 1000
  },
  movement: {
    head: 7,
    bytes: 1,
    cache: 5000,
    event: true
  }
};

function getMessageTypesForMetrics(metrics) {
  return metrics.map((name) => {
    const { [name]: options } = metricOptions;

    const {
      head,
      bytes,
      sanity: sanityOptions = {},
      timeout,
      event
    } = options;

    const parser = (input) => {
      if (bytes > 1) {
        return sanity(readNumber(input, bytes), sanityOptions);
      }

      return bufferToBoolean(input);
    };

    return {
      name,
      eventName: event ? name : undefined,
      head: Buffer.from([head]),
      parser,
      timeout
    };
  });
}

function getCaches(metrics) {
  return arraysToObject(
    metrics,
    metrics.map((name) => {
      const { [name]: { cache = 0 } = {} } = metricOptions;
      if (!cache) return null;
      return new CachePromise(cache);
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

    super({
      host,
      port,
      messageTypes: getMessageTypesForMetrics(metrics)
    });

    this._roomSensor = {
      metrics,
      caches: getCaches(metrics)
    };

    this.log.friendlyName(`${host}:${port}`);
    this._roomSensor.log = this.log.withPrefix(libName);
  }

  getMetric(metric) {
    const {
      state: {
        isConnected
      }
    } = this._persistentSocket;

    const {
      log,
      metrics,
      caches
    } = this._roomSensor;

    if (!isConnected) {
      return Promise.reject(new Error('sensor not connected'));
    }

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const { [metric]: cache } = caches;

    if (cache && cache.hit()) {
      return cache.defer();
    }

    return cache.promise(this.request(metric)).catch((reason) => {
      log.error({
        head: `metric (${metric}) error`,
        attachment: reason
      });
    });
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

    if (cache) {
      return Promise.resolve(cache.value);
    }

    return Promise.resolve(null);
  }

  getAll() {
    const {
      state: {
        isConnected
      }
    } = this._persistentSocket;

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
    });
  }

  getTemperature() {
    return this.getMetric('temperature');
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

  getMovement() {
    return this.getMetric('movement');
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

  // Public methods:
  // connect (inherited from PersistenSocket)
  // disconnect (inherited from PersistenSocket)
  // access (inherited from Base)
  // getMetric
  // getCache
  // getAll
  // getTemperature
  // getPressure
  // getHumidity
  // getBrightness
  // getEco2
  // getTvoc
  // getMovement
  // getMetricTime
}

module.exports = {
  RoomSensor
};
