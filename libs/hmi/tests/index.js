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

const every2Minutes = new RecurringMoment(scheduler, every.minute(2));

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
        if (metric === 'pressure') {
          return Math.round(value / 1000);
        }

        return Math.round(value);
      });
    },
    {},
    every.second()
  );

  every2Minutes.on('hit', () => {
    update(true); // simulate event every minute and force update
  });
});

hmi.on('change', (x) => {
  console.log(`${x.id}: ${x.value}`);
});

roomSensor.connect();
hmi.start();
