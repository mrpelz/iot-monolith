/* eslint-disable no-console */
const { Ev1527 } = require('../index');

// SOCKET TEST
const ev1527 = new Ev1527({
  host: 'flexo.net.wurstsalat.cloud',
  port: 9000
});

ev1527.trigger(...Ev1527.DOOR_SENSOR('wannenbad', 15442));
ev1527.trigger(...Ev1527.DOOR_SENSOR('schlafzimmer', 47642));
ev1527.trigger(...Ev1527.DOOR_SENSOR('abstellraum', 51866));
ev1527.trigger(...Ev1527.DOOR_SENSOR('wohnungstür', 52455));
ev1527.trigger(...Ev1527.DOOR_SENSOR('duschbad', 52595));
ev1527.trigger(...Ev1527.TX118SA4('thePushbutton', 570816));

ev1527.on('connect', async () => {
  console.log('connected');
});

ev1527.on('disconnect', () => {
  console.log('disconnected');
});

ev1527.on('hit', (event) => {
  console.log(event);
});

ev1527.connect();
