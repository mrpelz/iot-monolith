/* eslint-disable global-require */

function createInstances() {
  require('./instances/scheduler');
  require('./instances/prometheus');
  require('./instances/room-sensors');
}

function runLogic() {
  require('./logic/metrics-to-prometheus');
}

module.exports = {
  createInstances,
  runLogic
};
