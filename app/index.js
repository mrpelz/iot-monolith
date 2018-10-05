/* eslint-disable global-require */

function createInstances() {
  require('./instances/scheduler');
  require('./instances/room-sensors');
  require('./instances/metric-aggregates');
  require('./instances/lights');
  require('./instances/fans');
  require('./instances/ev1527-server');
  require('./instances/wall-switches');
  require('./instances/door-sensors');
  require('./instances/hmi-server');
  require('./instances/web-api');
  require('./instances/prometheus');
}

function runLogic() {
  require('./logic/lights');
  require('./logic/fans');
  require('./logic/hmi');
  require('./logic/prometheus');
}

module.exports = {
  createInstances,
  runLogic
};
