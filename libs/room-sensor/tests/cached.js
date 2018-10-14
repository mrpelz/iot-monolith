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

roomSensor.on('connect', () => {
  roomSensor.getTemperature().then((value) => {
    console.log(value);
  }).catch((reason) => {
    console.error(reason);
  });

  roomSensor.getTemperature().then((value) => {
    console.log(value);
  }).catch((reason) => {
    console.error(reason);
  });

  setTimeout(() => {
    roomSensor.getTemperature().then((value) => {
      console.log(value);
    }).catch((reason) => {
      console.error(reason);
    });
  }, 500);

  setTimeout(() => {
    roomSensor.getTemperature().then((value) => {
      console.log(value);
    }).catch((reason) => {
      console.error(reason);
    });
  }, 1500);

  setTimeout(() => {
    roomSensor.disconnect();
  }, 5000);
});

roomSensor.connect();
