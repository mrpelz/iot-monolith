/* eslint-disable no-console */
const { RoomSensor } = require('../index');

const roomSensor = new RoomSensor({
  host: '10.97.0.222',
  port: 5045,
  metrics: [
    'temperature',
    'temperature2',
    'pressure',
    'humidity',
    'brightness',
    'movement'
  ]
});

const handleMovement = () => {
  console.log('movement', roomSensor.getState('movement'));

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
  roomSensor.getBrightness().then((value) => {
    console.log('brightness', value, '\n');
  });
};

roomSensor.on('connect', () => {
  console.log('connected', '\n');
  roomSensor.on('movement', handleMovement);
});

roomSensor.on('disconnect', () => {
  console.log('disconnected', '\n');
  roomSensor.removeListener('movement', handleMovement);
});

roomSensor.connect();
