const { MessageClient } = require('../messaging');
const { cacheAll } = require('../cache');
const { readNumber, sanity } = require('../utils/data');
const { arraysToObject } = require('../utils/structures');
const { resolveAlways } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'room-sensor';
const refreshAtMost = 1000;

const metricOptions = {
  temperature: {
    head: 1,
    bytes: 2,
    sanity: {
      offset: -4000,
      divide: 100,
      max: 10000,
      min: 0
    }
  },
  pressure: {
    head: 2,
    bytes: 4,
    sanity: {
      divide: 100
    }
  },
  humidity: {
    head: 3,
    bytes: 2,
    sanity: {
      divide: 100
    }
  },
  brightness: {
    head: 4,
    bytes: 4,
    sanity: {
      divide: 100
    }
  },
  eco2: {
    head: 5,
    bytes: 2
  },
  tvoc: {
    head: 6,
    bytes: 2,
    sanity: {
      divide: 1000
    }
  }
};

function getMessageTypesForMetrics(metrics) {
  return metrics.map((name) => {
    const { [name]: options } = metricOptions;

    const {
      head,
      bytes,
      sanity: sanityOptions = {},
      timeout
    } = options;

    const parser = (input) => {
      return sanity(readNumber(input, bytes), sanityOptions);
    };

    return {
      name,
      head: Buffer.from([head]),
      parser,
      timeout
    };
  });
}

class RoomSensor extends MessageClient {
  constructor(options) {
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

    this._roomSensor = {};
    this._roomSensor.metrics = metrics;

    this._roomSensor.log = new Logger(libName, `${host}:${port}`);
  }

  _getMetric(metric) {
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

    if (!metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    return this.request(metric).catch((reason) => {
      log.notice({
        head: `metric (${metric}) error`,
        attachment: reason
      });
    });
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
      return resolveAlways(this.request(metric));
    })).then((values) => {
      return arraysToObject(metrics, values);
    }).catch((reason) => {
      log.notice({
        head: 'getAll error',
        attachment: reason
      });
    });
  }

  getTemperature() {
    return this._getMetric('temperature');
  }

  getPressure() {
    return this._getMetric('pressure');
  }

  getHumidity() {
    return this._getMetric('humidity');
  }

  getBrightness() {
    return this._getMetric('brightness');
  }

  getEco2() {
    return this._getMetric('eco2');
  }

  getTvoc() {
    return this._getMetric('tvoc');
  }

  // Public methods:
  // connect
  // disconnect
  // getAll
  // getTemperature
  // getPressure
  // getHumidity
  // getBrightness
  // getEco2
  // getTvoc
}

class CachedRoomSensor extends RoomSensor {
  constructor(...options) {
    super(...options);
    return cacheAll(this, refreshAtMost, RoomSensor);
  }
}

module.exports = {
  RoomSensor,
  CachedRoomSensor
};
