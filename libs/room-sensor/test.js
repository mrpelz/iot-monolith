/* eslint-disable no-console */
const { RoomSensor } = require('./index');

const roomSensor = new RoomSensor({
  host: 'panucci.net.wurstsalat.cloud',
  port: 3000,
  metrics: [
    'temperature',
    'pressure',
    'humidity',
    'brightness'
  ]
});

roomSensor.on('connect', async () => {
  try {
    console.log(`getAll result: ${JSON.stringify(await roomSensor.getAll())}`);

    console.log(`temperature: ${await roomSensor.getMetric('temperature')} °C`);
    console.log(`pressure: ${await roomSensor.getMetric('pressure')} Pa`);
    console.log(`humidity: ${await roomSensor.getMetric('humidity')} RH`);
    console.log(`brightness: ${await roomSensor.getMetric('brightness')} lux`);
  } catch (error) {
    console.error('error', error);
  }

  roomSensor.disconnect();
});

roomSensor.connect();
