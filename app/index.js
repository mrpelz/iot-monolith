/* eslint-disable global-require */

function createInstances() {
  require('./instances/scheduler');
  require('./instances/room-sensors');
  require('./instances/lights');
  require('./instances/ev1527-server');
  require('./instances/wall-switches');
  require('./instances/door-sensors');
  require('./instances/hmi-server');
  require('./instances/web-api');
  require('./instances/prometheus');
}

function runLogic() {
  require('./logic/lights');
  require('./logic/metrics-to-hmi');
  require('./logic/metrics-to-prometheus');
}

module.exports = {
  createInstances,
  runLogic
};
