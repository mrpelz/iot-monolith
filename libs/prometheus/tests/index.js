/* eslint-disable no-console */
const { Prometheus } = require('../index');
const { RoomSensor } = require('../../room-sensor');

const prometheus = new Prometheus({
  port: 5555
});

const metrics = [
  'temperature',
  'pressure',
  'humidity',
  'brightness'
];

const roomSensor = new RoomSensor({
  host: 'panucci.net.wurstsalat.cloud',
  port: 3000,
  metrics
});

metrics.forEach((metric) => {
  prometheus.metric(
    metric,
    { location: 'duschbad' },
    () => {
      return roomSensor.getMetric(metric);
    },
    () => {
      return roomSensor.getMetricTime(metric);
    }
  );
});

metrics.forEach((metric) => {
  prometheus.metric(
    metric,
    { location: 'duschbad-mirrored' },
    () => {
      return roomSensor.getMetric(metric);
    },
    () => {
      return roomSensor.getMetricTime(metric);
    }
  );
});

roomSensor.connect();
prometheus.start();
