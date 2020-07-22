import { bufferToBoolean, readNumber } from '../utils/data.js';
import { CachePromise } from '../cache/index.js';
import { MessageClient } from '../messaging/index.js';
import { resolveAlways } from '../utils/oop.js';
import { sanity } from '../utils/math.js';
import { sleep } from '../utils/time.js';

const libName = 'room-sensor';

const metricOptions = {
  brightness: {
    bytes: 4,
    cache: 1000,
    head: 4,
    sanity: {
      divide: 100,
    },
  },
  co: {
    bytes: 4,
    cache: 300000,
    head: 12,
    leadIn: 300000,
    request: false,
    sanity: {
      divide: 1000,
    },
    timeout: 60000,
  },
  co2: {
    bytes: 2,
    cache: 1000,
    head: 10,
    leadIn: 180000,
    tolerateNull: true,
  },
  eco2: {
    bytes: 2,
    cache: 1000,
    head: 5,
    leadIn: 15000,
  },
  humidity: {
    bytes: 2,
    cache: 1000,
    head: 3,
    sanity: {
      divide: 100,
    },
  },
  movement: {
    bytes: 1,
    event: true,
    head: 7,
    request: false,
  },
  pm025: {
    bytes: 4,
    cache: 60000,
    head: 8,
    request: false,
    sanity: {
      divide: 1000,
    },
    timeout: 15000,
    tolerateNull: true,
  },
  pm10: {
    bytes: 4,
    cache: 60000,
    head: 9,
    request: false,
    sanity: {
      divide: 1000,
    },
    timeout: 15000,
    tolerateNull: true,
  },
  pressure: {
    bytes: 4,
    cache: 1000,
    head: 2,
    sanity: {
      divide: 100,
    },
  },
  temperature: {
    bytes: 2,
    cache: 1000,
    head: 1,
    sanity: {
      divide: 100,
      max: 10000,
      min: 0,
      offset: -4000,
    },
  },
  temperature2: {
    bytes: 2,
    cache: 1000,
    head: 11,
    sanity: {
      divide: 100,
      max: 10000,
      min: 0,
      offset: -4000,
    },
  },
  tvoc: {
    bytes: 2,
    cache: 1000,
    head: 6,
    leadIn: 15000,
  },
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
      tolerateNull,
    } = options;

    const parser = (input) => {
      if (!input.length) {
        if (tolerateNull) {
          return null;
        }

        throw new Error('received null value');
      }

      const result =
        bytes > 1
          ? sanity(readNumber(input, bytes), sanityOptions)
          : bufferToBoolean(input);

      state.set(name, result);

      return result;
    };

    const eventParser = event
      ? (input) => {
          if (!input.length) return undefined;

          const payload = input.slice(1);
          if (!payload.length) return undefined;

          const result =
            bytes > 1
              ? sanity(readNumber(payload, bytes), sanityOptions)
              : bufferToBoolean(payload);

          state.set(name, result);

          return result;
        }
      : undefined;

    return {
      eventName: event ? name : undefined,
      eventParser,
      head: Buffer.from([head]),
      name,
      parser,
      timeout,
    };
  });

  return {
    state,
    types,
  };
}

function getCaches(metrics) {
  return Object.fromEntries(
    metrics.map((name) => {
      const { [name]: { cache = 0, timeout = 1000 } = {} } = metricOptions;

      if (!cache) return [name, null];
      return [name, new CachePromise(cache + timeout)];
    })
  );
}

export class RoomSensor extends MessageClient {
  constructor(options = {}) {
    const { host = null, port = null, metrics = [] } = options;

    if (!host || !port || !metrics.length) {
      throw new Error('insufficient options provided');
    }

    const { state, types } = prepareMetricHandlers(metrics);

    super({
      host,
      messageTypes: types,
      port,
    });

    this._roomSensor = {
      caches: getCaches(metrics),
      metrics,
      state,
    };

    this.log.friendlyName(`${host}:${port}`);
    this._roomSensor.log = this.log.withPrefix(libName);
  }

  requestMetric(metric) {
    const {
      state: { isConnected, connectionTime },
    } = this._reliableSocket;

    const { log, caches } = this._roomSensor;

    if (!isConnected) {
      return Promise.reject(new Error('sensor not connected'));
    }

    const { [metric]: cache } = caches;
    const { [metric]: { leadIn = 0 } = {} } = metricOptions;

    const isLeadIn = Date.now() < connectionTime + leadIn;

    if (cache) {
      if (cache.hit()) {
        return cache.defer();
      }

      return cache
        .promise(this.request(metric, undefined, isLeadIn))
        .catch((reason) => {
          log.error({
            attachment: reason,
            head: `metric [cached] (${metric}) error`,
          });

          throw reason;
        });
    }

    return this.request(metric, undefined, isLeadIn).catch((reason) => {
      log.error({
        attachment: reason,
        head: `metric [uncached] (${metric}) error`,
      });

      throw reason;
    });
  }

  getMetric(metric, timeout = null) {
    const { metrics } = this._roomSensor;

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const { [metric]: { cache = 0, request = true } = {} } = metricOptions;

    const fallback = cache ? this.getCache(metric) : this.getState(metric);

    if (!request) {
      return Promise.resolve(fallback);
    }

    if (timeout) {
      return Promise.race([
        this.requestMetric(metric),
        sleep(timeout, fallback),
      ]);
    }

    return this.requestMetric(metric);
  }

  getCache(metric) {
    const { metrics, caches } = this._roomSensor;

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
    const { metrics, caches } = this._roomSensor;

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    const { [metric]: cache } = caches;

    return cache ? cache.resultTime : null;
  }

  getAll() {
    const {
      state: { isConnected },
    } = this._reliableSocket;

    const { log, metrics } = this._roomSensor;

    if (!isConnected) {
      return Promise.reject(new Error('sensor not connected'));
    }

    return Promise.all(
      metrics.map((metric) => {
        return [metric, resolveAlways(this.getMetric(metric))];
      })
    )
      .then((entries) => {
        return Object.fromEntries(entries);
      })
      .catch((reason) => {
        log.error({
          attachment: reason,
          head: 'getAll error',
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
