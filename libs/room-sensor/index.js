const { MessageClient } = require('../messaging');
const { arraysToObject, readNumber, sanity } = require('../utils/data');
const { resolveAlways } = require('../utils/oop');

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

    this._metrics = metrics;
  }

  getMetric(metric) {
    if (!this._state.isConnected) {
      throw new Error('sensor not connected');
    }

    if (!this._metrics.includes(metric)) {
      throw new Error('metric not configured');
    }

    return this.request(metric).catch((reason) => {
      throw new Error(`cannot request ${metric}: ${reason}`);
    });
  }

  getAll() {
    if (!this._state.isConnected) {
      throw new Error('sensor not connected');
    }

    return Promise.all(this._metrics.map((metric) => {
      return resolveAlways(this.request(metric));
    })).then((values) => {
      return arraysToObject(this._metrics, values);
    });
  }

  // Public methods:
  // start
  // stop
  // getMetric
  // getAll
}

module.exports = {
  RoomSensor
};
