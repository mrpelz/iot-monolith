/* eslint-disable no-console */
const { RoomSensor } = require('../index');

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

    console.log(`temperature: ${await roomSensor.getTemperature()} °C`);
    console.log(`pressure: ${await roomSensor.getPressure()} Pa`);
    console.log(`humidity: ${await roomSensor.getHumidity()} RH`);
    console.log(`brightness: ${await roomSensor.getBrightness()} lux`);
  } catch (error) {
    console.error('error', error);
  }

  roomSensor.disconnect();
});

roomSensor.connect();
