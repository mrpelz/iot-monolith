const { Prometheus } = require('../../lib/prometheus');

function create(config, data) {
  const {
    globals: {
      prometheusPort
    }
  } = config;

  const prometheus = new Prometheus({
    port: prometheusPort
  });

  prometheus.start();

  Object.assign(data, {
    prometheus
  });
}

module.exports = {
  create
};
