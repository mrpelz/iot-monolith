process.stdin.resume();

const { chatIds, telegramSend } = require('./libs/telegram/simple');

function exit(signal = 0) {
  process.removeListener('SIGINT', exit);
  process.removeListener('SIGTERM', exit);
  process.removeListener('SIGUSR1', exit);
  process.removeListener('SIGUSR2', exit);

  process.exit(signal);
}

process.on('uncaughtException', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`unhandled exception: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramSend(
    chatIds.log,
    [
      '*$ROOT*',
      '_uncaughtException_',
      error.message || null,
      error.stack ? `\`${error.stack}\`` : null
    ].filter(Boolean).join('  \n')
  ).catch((telegramError) => {
    /* eslint-disable-next-line no-console */
    console.error(`error logging to telegram: "${telegramError}"`);
  });
  exit(1);
});

process.on('unhandledRejection', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`unhandled rejection: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramSend(
    chatIds.log,
    [
      '*$ROOT*',
      '_unhandledRejection_',
      error.message || null,
      error.stack ? `\`${error.stack}\`` : null
    ].filter(Boolean).join('  \n')
  ).catch((telegramError) => {
    /* eslint-disable-next-line no-console */
    console.error(`error logging to telegram: "${telegramError}"`);
  });
  exit(1);
});

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);

const { readConfig } = require('./config');
const { createInstances, runLogic } = require('./app');

(function run() {
  readConfig();
  createInstances();
  runLogic();
}());
