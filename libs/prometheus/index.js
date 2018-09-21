const { HttpServer } = require('../http/server');
const { rebind, resolveAlways } = require('../utils/oop');
const { trimDecimals } = require('../utils/math');
const { Logger } = require('../log');

const libName = 'prometheus';

function makeLabelString(labels) {
  if (!labels) {
    return '';
  }

  return Object.keys(labels).map((key) => {
    const value = labels[key];
    return `${key}="${value}"`;
  }).join(',');
}

function drawValue(input) {
  if (input === null) return 'nan';
  if (input === false) return '0';
  if (input === true) return '1';

  return trimDecimals(input).toString();
}

function drawMetric(prefix, name, labelString, value) {
  return `${prefix}${name}{${labelString}} ${value}`;
}

class Prometheus {
  constructor(options = {}) {
    const {
      port,
      prefix = 'iot_'
    } = options;

    if (!port || !prefix) {
      throw new Error('insufficient options provided');
    }

    this._prometheus = {
      metrics: [],
      prefix
    };

    rebind(this, '_handleRequest');

    this._prometheus.server = new HttpServer({
      port,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        Server: 'iot-monolith prometheus'
      },
      handler: HttpServer.do404
    });
    this._prometheus.server.route('/metrics', this._handleRequest);

    this._prometheus.log = new Logger(Logger.NAME(libName, port));
  }

  _handleRequest() {
    const { log, metrics } = this._prometheus;

    log.debug('getting metrics');

    const calls = metrics.map((metric) => {
      return metric();
    });

    return {
      handler: Promise.all(calls).then((values) => {
        return `${values.join('\n')}\n`;
      })
    };
  }

  start() {
    const { log, server } = this._prometheus;

    log.info({
      head: 'set active',
      value: true
    });

    server.listen();
  }

  stop() {
    const { log, server } = this._prometheus;

    log.info({
      head: 'set active',
      value: false
    });

    server.close();
  }

  metric(name, labels, handler) {
    if (!name || !handler) {
      throw new Error('insufficient options provided');
    }

    if (name.includes(' ') || name.includes('-')) {
      throw new Error('illegal metric name');
    }

    const { log, metrics, prefix } = this._prometheus;

    log.info(`add metric "${name}"`);

    const labelString = makeLabelString(labels);
    metrics.push(() => {
      return resolveAlways(handler()).then((value) => {
        log.debug({
          head: `got metric "${name}"`,
          value
        });

        return drawMetric(prefix, name, labelString, drawValue(value));
      });
    });
  }
}

module.exports = {
  Prometheus
};
