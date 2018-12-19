/* eslint-disable no-console */
const { RoomSensor } = require('../index');

const roomSensor = new RoomSensor({
  host: '10.97.0.222',
  port: 5045,
  metrics: [
    'temperature',
    'pressure',
    'humidity',
    'brightness',
    'movement'
  ]
});

const handleMovement = () => {
  roomSensor.getMovement().then((value) => {
    console.log('movement', value);
  });
  roomSensor.getTemperature().then((value) => {
    console.log(value);
  });
  roomSensor.getPressure().then((value) => {
    console.log(value);
  });
  roomSensor.getHumidity().then((value) => {
    console.log(value);
  });
  roomSensor.getBrightness().then((value) => {
    console.log(value);
  });
};

roomSensor.on('connect', () => {
  console.log('connected');
  roomSensor.on('movement', handleMovement);
});

roomSensor.on('disconnect', () => {
  console.log('disconnected');
  roomSensor.removeListener('movement', handleMovement);
});

roomSensor.connect();
