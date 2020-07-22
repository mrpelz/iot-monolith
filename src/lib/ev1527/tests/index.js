/* eslint-disable no-console */
import { DoorSensor } from '../../door-sensor/index.js';
import { Ev1527Server } from '../index.js';
import { Tx118sa4 } from '../../tx118sa4/index.js';

const server = new Ev1527Server({
  host: 'flexo.net.wurstsalat.cloud',
  port: 9000,
});

const doorSensors = [
  {
    id: 15442,
    name: 'wannenbad',
  },
  {
    id: 47642,
    name: 'schlafzimmer',
  },
  {
    id: 51866,
    name: 'abstellraum',
  },
  {
    id: 52455,
    name: 'wohnungstür',
  },
  {
    id: 52595,
    name: 'duschbad',
  },
];

doorSensors.forEach((sensor) => {
  const { name, id } = sensor;

  const doorSensor = new DoorSensor({
    id,
    server,
  });

  doorSensor.on('change', () => {
    console.log(`"${name}" was ${doorSensor.isOpen ? 'opened' : 'closed'}`);
  });
});

const thePushbutton = new Tx118sa4({
  id: 570816,
  server,
});
thePushbutton.on('one', () => {
  console.log('thePushbutton one was pressed');
});
thePushbutton.on('two', () => {
  console.log('thePushbutton two was pressed');
});
thePushbutton.on('three', () => {
  console.log('thePushbutton three was pressed');
});
thePushbutton.on('four', () => {
  console.log('thePushbutton four was pressed');
});

server.on('connect', async () => {
  console.log('connected');
});

server.on('disconnect', () => {
  console.log('disconnected');
});

server.connect();
