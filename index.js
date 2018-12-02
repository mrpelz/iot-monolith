process.stdin.resume();

const { chatIds, telegramSend } = require('./libs/telegram/simple');

function telegramRoot(title = '', message, stack) {
  return telegramSend(
    chatIds.log,
    [
      '*ROOT*',
      `_${title}_`,
      message || null,
      stack ? `\`${stack}\`` : null
    ].filter(Boolean).join('  \n')
  ).then(() => {
    return null;
  }).catch(() => {
    return null;
  });
}

(function onStart() {
  telegramRoot('Starting process');
}());

function quit(signal) {
  process.nextTick(() => {
    process.exit(signal);
  });
}

function exit(signal = 0) {
  process.removeListener('SIGINT', exit);
  process.removeListener('SIGTERM', exit);
  process.removeListener('SIGUSR1', exit);
  process.removeListener('SIGUSR2', exit);

  telegramRoot('Stopping process', `Signal = ${signal}`).then(() => {
    quit(signal);
  });
}

process.on('uncaughtException', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`uncaughtException: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramRoot('uncaughtException', error.message, error.stack).then(() => {
    exit(1);
  });
});

process.on('unhandledRejection', (error) => {
  /* eslint-disable-next-line no-console */
  console.error(`unhandledRejection: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramRoot('unhandledRejection', error.message, error.stack).then(() => {
    exit(1);
  });
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
