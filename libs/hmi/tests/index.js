/* eslint-disable no-console */
const { Hmi } = require('../index');
const { every, Scheduler, RecurringMoment } = require('../../utils/time');
const { CachedRoomSensor } = require('../../room-sensor');

const metrics = [
  'temperature',
  'pressure',
  'humidity',
  'brightness'
];

const scheduler = new Scheduler();

const hmi = new Hmi({
  scheduler
});

const everyMinuteChange = new RecurringMoment(scheduler, every.minute());

const roomSensor = new CachedRoomSensor({
  host: 'panucci.net.wurstsalat.cloud',
  port: 3000,
  metrics
});

metrics.forEach((metric) => {
  const handler = roomSensor.access('get', metric);
  const { update } = hmi.element(
    `duschbadRoomSensor_${metric}`,
    () => {
      return handler().then((value) => {
        return Math.round(value);
      });
    },
    {},
    every.second(5)
  );

  everyMinuteChange.on('hit', () => {
    update(-9000); // simulate event every minute
  });
});

hmi.on('change', (x) => {
  console.log(`${x.id}: ${x.value}`);
});

roomSensor.connect();
hmi.start();
