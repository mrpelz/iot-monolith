const { Prometheus } = require('../../libs/prometheus');

const {
  config: {
    globals: {
      prometheusPort
    }
  }
} = global;

const prometheus = new Prometheus({
  port: prometheusPort
});
prometheus.start();

global.prometheus = prometheus;
