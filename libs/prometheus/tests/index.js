/* eslint-disable no-console */
const { Prometheus } = require('../index');
const { CachedRoomSensor } = require('../../room-sensor');

const prometheus = new Prometheus({
  port: 5555
});

const metrics = [
  'temperature',
  'pressure',
  'humidity',
  'brightness'
];

const roomSensor = new CachedRoomSensor({
  host: 'panucci.net.wurstsalat.cloud',
  port: 3000,
  metrics
});

metrics.forEach((metric) => {
  prometheus.metric(
    metric,
    { location: 'duschbad' },
    roomSensor.access('get', metric)
  );
});

metrics.forEach((metric) => {
  prometheus.metric(
    metric,
    { location: 'duschbad-mirrored' },
    roomSensor.access('get', metric)
  );
});

roomSensor.connect();
prometheus.start();
