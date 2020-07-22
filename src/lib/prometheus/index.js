import { rebind, resolveAlways } from '../utils/oop.js';
import { HttpServer } from '../http/server.js';
import { Logger } from '../log/index.js';
import { trimDecimals } from '../utils/math.js';

const libName = 'prometheus';

function makeLabelString(labels) {
  if (!labels) {
    return '';
  }

  return Object.keys(labels)
    .map((key) => {
      const value = labels[key];
      return `${key}="${value}"`;
    })
    .join(',');
}

function drawValue(input) {
  if (input === null) return 'nan';
  if (input === false) return '0';
  if (input === true) return '1';

  return trimDecimals(input).toString();
}

function drawMetric(prefix, name, labelString, value, time) {
  return `${prefix}${name}{${labelString}} ${value} ${time}`;
}

function isLegalMetricName(name) {
  if (name.includes(' ') || name.includes('-')) {
    throw new Error('illegal metric name');
  }
}

export class Prometheus {
  constructor(options = {}) {
    const { port, prefix = 'iot_' } = options;

    if (!port || !prefix) {
      throw new Error('insufficient options provided');
    }

    this._prometheus = {
      metrics: [],
      prefix,
    };

    rebind(this, '_handleRequest');

    this._prometheus.server = new HttpServer({
      handler: HttpServer.do404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Server: 'iot-monolith prometheus',
      },
      port,
    });
    this._prometheus.server.route('/metrics', this._handleRequest);

    const log = new Logger();
    log.friendlyName(`Prometheus (${port})`);
    this._prometheus.log = log.withPrefix(libName);
  }

  _handleRequest(request) {
    const { log, metrics } = this._prometheus;
    const {
      urlQuery: { test = false },
    } = request;

    const testOnly = Boolean(test);

    log.debug('getting metrics');

    const calls = metrics
      .map((metric) => {
        return metric(testOnly);
      })
      .filter(Boolean);

    return {
      handler: Promise.all(calls).then((values) => {
        return `${values.join('\n')}\n`;
      }),
    };
  }

  start() {
    const { log, server } = this._prometheus;

    log.info({
      head: 'set active',
      value: true,
    });

    server.listen();
  }

  stop() {
    const { log, server } = this._prometheus;

    log.info({
      head: 'set active',
      value: false,
    });

    server.close();
  }

  metric(name, labels, handler, timeHandler = null) {
    if (!name || !handler) {
      throw new Error('insufficient options provided');
    }

    isLegalMetricName(name);

    const { log, metrics, prefix } = this._prometheus;

    log.info(`add metric "${name}"`);

    const labelString = makeLabelString(labels);

    metrics.push(() => {
      return resolveAlways(handler()).then((value) => {
        const now = new Date();
        const time = timeHandler && value !== null ? timeHandler() || now : now;

        log.debug({
          head: `got metric "${name}"`,
          value,
        });

        return drawMetric(
          prefix,
          name,
          labelString,
          drawValue(value),
          time.getTime()
        );
      });
    });
  }

  pushMetric(name, labels) {
    if (!name) {
      throw new Error('insufficient options provided');
    }

    isLegalMetricName(name);

    const { log, metrics, prefix } = this._prometheus;

    log.info(`add push metric "${name}"`);

    const labelString = makeLabelString(labels);

    const values = [];

    const push = (value) => {
      values.push({
        time: new Date(),
        value,
      });
    };

    metrics.push((test) => {
      const now = new Date();
      const { time = null, value = null } = values[0] || {};

      if (!test && values.length > 1) {
        values.shift();
      }

      if (values.length === 1) {
        values[0].time = null;
      }

      return Promise.resolve(
        drawMetric(
          prefix,
          name,
          labelString,
          drawValue(value),
          (time || now).getTime()
        )
      );
    });

    return {
      push,
    };
  }

  slowMetric(name, labels, handler) {
    if (!name || !handler) {
      throw new Error('insufficient options provided');
    }

    isLegalMetricName(name);

    const { log, metrics, prefix } = this._prometheus;

    log.info(`add slow metric "${name}"`);

    const labelString = makeLabelString(labels);

    let lastValue = null;

    metrics.push(async () => {
      resolveAlways(handler()).then((value) => {
        lastValue = value;
      });

      const result = await drawMetric(
        prefix,
        name,
        labelString,
        drawValue(lastValue),
        Date.now()
      );

      return result;
    });
  }
}
