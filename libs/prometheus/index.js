const { HttpServer } = require('../http');
const { rebind } = require('../utils/oop');
const { Logger } = require('../log');

const libName = 'prometheus';

class Prometheus {
  constructor(options) {
    const {
      port
    } = options;

    if (!port) {
      throw new Error('insufficient options provided');
    }

    this._prometheus = {};

    rebind(this, '_handleRequest');
    this.on('connect', this._handlePrometheusConnection);

    this._prometheus.log = new Logger(Logger.NAME(libName, port));
  }
}

module.exports = {
  Prometheus
};
