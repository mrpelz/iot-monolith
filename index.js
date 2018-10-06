const { readConfig } = require('./config');
const { createInstances, runLogic } = require('./app');

(function run() {
  readConfig();
  createInstances();
  runLogic();
}());

process.on('uncaughtException', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`unhandled exception: ${error}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`unhandled rejection: ${error}`);
  process.exit(1);
});
