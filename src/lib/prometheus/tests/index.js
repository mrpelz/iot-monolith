/* eslint-disable no-console */
import { Prometheus } from '../index.js';

import { RoomSensor } from '../../room-sensor/index.js';

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

const metric = prometheus.pushMetric(
  'pushtest',
  { push: 'push' }
);

let count = 0;
setInterval(() => {
  count += 1;
  metric.push(count);
}, 5000);

roomSensor.connect();
prometheus.start();
