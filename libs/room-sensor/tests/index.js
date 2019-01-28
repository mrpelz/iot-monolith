/* eslint-disable no-console */
const { RoomSensor } = require('../index');

const roomSensor = new RoomSensor({
  host: '10.97.0.223',
  port: 5045,
  metrics: [
    'temperature',
    'temperature2',
    'pressure',
    'humidity',
    // 'brightness',
    'dihydrogen',
    'ethanol',
    'pm025',
    'pm10',
    'co2',
    // 'movement'
  ]
});

let interval = null;

const get = () => {
  roomSensor.getTemperature().then((value) => {
    console.log('temperature', value);
  });
  roomSensor.getTemperature2().then((value) => {
    console.log('temperature2', value);
  });
  roomSensor.getPressure().then((value) => {
    console.log('pressure', value);
  });
  roomSensor.getHumidity().then((value) => {
    console.log('humidity', value);
  });
  // roomSensor.getBrightness().then((value) => {
  //   console.log('brightness', value, '\n');
  // });
  // roomSensor.getDihydrogen().then((value) => {
  //   console.log('dihydrogen', value);
  // });
  // roomSensor.getEthanol().then((value) => {
  //   console.log('ethanol', value);
  // });
  roomSensor.getPm025().then((value) => {
    console.log('pm025', value);
  });
  roomSensor.getPm10().then((value) => {
    console.log('pm10', value);
  });
  roomSensor.getCo2().then((value) => {
    console.log('co2', value);
  });
};

const handleMovement = () => {
  console.log('movement', roomSensor.getState('movement'));

  get();
};

roomSensor.on('connect', () => {
  console.log('connected', '\n');
  // roomSensor.on('movement', handleMovement);

  interval = setInterval(get, 10000);
  get();
});

roomSensor.on('disconnect', () => {
  console.log('disconnected', '\n');
  roomSensor.removeListener('movement', handleMovement);

  if (interval) {
    clearInterval(interval);
  }
});

roomSensor.connect();
