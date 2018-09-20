/* eslint-disable no-console */
const { HmiServer, HmiElement } = require('../index');
const { every, Scheduler, RecurringMoment } = require('../../utils/time');
const { CachedRoomSensor } = require('../../room-sensor');
const { WebApi } = require('../../web-api');

const metrics = [
  'temperature',
  'pressure',
  'humidity',
  'brightness'
];

const scheduler = new Scheduler();
const every30Seconds = new RecurringMoment(scheduler, every.second(30));

const hmiServer = new HmiServer();

const roomSensor = new CachedRoomSensor({
  host: 'panucci.net.wurstsalat.cloud',
  port: 3000,
  metrics
});

metrics.forEach((metric) => {
  const get = roomSensor.access('get', metric);
  const sanity = (
    metric === 'pressure'
      ? {
        divide: 1000,
        round: true
      }
      : {
        round: true
      }
  );

  const hmiElement = new HmiElement({
    name: `testRoomSensor_${metric}`,
    attributes: {
      these: 'are',
      test: 'attributes'
    },
    sanity,
    server: hmiServer,
    handlers: { get }
  });

  if (metric === 'brightness') {
    every30Seconds.on('hit', async () => {
      console.log('force brightness');
      await hmiElement.update();
      console.log();
    });
  }
});

hmiServer.addService(({ name, value }) => {
  console.log('ingestor', name, value);
});

const webApi = new WebApi({
  port: 8080,
  hmiServer,
  scheduler
});

webApi.start();
roomSensor.connect();
