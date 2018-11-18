/* eslint-disable global-require */

function createInstances() {
  require('./instances/scheduler');
  require('./instances/db');
  require('./instances/room-sensors');
  require('./instances/metric-aggregates');
  require('./instances/lights');
  require('./instances/light-groups');
  require('./instances/fans');
  require('./instances/ev1527-server');
  require('./instances/wall-switches');
  require('./instances/door-sensors');
  require('./instances/histories');
  require('./instances/hmi-server');
  require('./instances/web-api');
  require('./instances/prometheus');
  require('./instances/http-hooks');
}

function runLogic() {
  require('./logic/lights');
  require('./logic/light-groups');
  require('./logic/fans');
  require('./logic/hmi');
  require('./logic/prometheus');
  require('./logic/fridge-utils');
}

module.exports = {
  createInstances,
  runLogic
};
