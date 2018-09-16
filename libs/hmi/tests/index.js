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
const every30Seconds = new RecurringMoment(scheduler, every.second(30));

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

  if (metric === 'brightness') {
    every30Seconds.on('hit', () => {
      update(true); // simulate event every 30 seconds and force update brightness
    });
  }
});

every2Minutes.on('hit', () => {
  hmi.updateAll(); // simulate event every 2 minutes and force update all
});

hmi.on('change', (x) => {
  console.log(`${x.id}: ${x.value}`);
});

roomSensor.connect();
hmi.start();
