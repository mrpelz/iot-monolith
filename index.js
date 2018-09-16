const { readConfig } = require('./config');
const { createInstances, runLogic } = require('./app');

(function run() {
  readConfig();
  createInstances();
  runLogic();
}());
