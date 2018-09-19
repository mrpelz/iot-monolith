/* eslint-disable no-console */
const { Ev1527, Ev1527Device } = require('../index');

const server = new Ev1527({
  host: 'flexo.net.wurstsalat.cloud',
  port: 9000
});

const devices = [
  {
    name: 'wannenbad',
    id: 15442,
    type: 'DOOR_SENSOR'
  },
  {
    name: 'schlafzimmer',
    id: 47642,
    type: 'DOOR_SENSOR'
  },
  {
    name: 'abstellraum',
    id: 51866,
    type: 'DOOR_SENSOR'
  },
  {
    name: 'wohnungstür',
    id: 52455,
    type: 'DOOR_SENSOR'
  },
  {
    name: 'duschbad',
    id: 52595,
    type: 'DOOR_SENSOR'
  },
  {
    name: 'thePushbutton',
    id: 570816,
    type: 'TX118SA4'
  }
];

devices.forEach((device) => {
  const { name, id, type } = device;
  const { [type]: matchFn } = Ev1527Device;

  const instance = new Ev1527Device({
    name,
    id,
    server,
    matchFn
  });

  switch (type) {
    case 'DOOR_SENSOR':
      instance.on('close', () => {
        console.log(`"${name}" was closed`);
      });
      instance.on('open', () => {
        console.log(`"${name}" was opened`);
      });
      instance.on('tamper', () => {
        console.log(`"${name}" was tampered with`);
      });
      break;
    case 'TX118SA4':
      instance.on('one', () => {
        console.log(`button one of "${name}" was pressed`);
      });
      instance.on('two', () => {
        console.log(`button two of "${name}" was pressed`);
      });
      instance.on('three', () => {
        console.log(`button three of "${name}" was pressed`);
      });
      instance.on('four', () => {
        console.log(`button four of "${name}" was pressed`);
      });
      break;
    default:
  }
});

server.on('connect', async () => {
  console.log('connected');
});

server.on('disconnect', () => {
  console.log('disconnected');
});

server.connect();
