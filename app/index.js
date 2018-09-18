/* eslint-disable global-require */

function createInstances() {
  require('./instances/scheduler');
  require('./instances/prometheus');
  require('./instances/room-sensors');
  require('./instances/lights');
  require('./instances/ev1527');
}

function runLogic() {
  require('./logic/metrics-to-prometheus');
  require('./logic/lights');
}

module.exports = {
  createInstances,
  runLogic
};
