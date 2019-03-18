Error.stackTraceLimit = 50;
process.stdin.resume();

const { telegramSend } = require('./libs/telegram/simple');
const { parseString } = require('./libs/utils/string');

(function populateGlobalVars() {
  const { PROD_ENV, LOG_LEVEL, LOG_TELEGRAM } = process.env;
  const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
  const logLevel = parseString(LOG_LEVEL);
  const logTelegram = LOG_TELEGRAM ? Boolean(parseString(LOG_TELEGRAM)) : true;

  Object.assign(global, {
    isProd,
    logLevel,
    logTelegram
  });
}());

function telegramRoot(title = '', message, stack) {
  if (!global.logTelegram) {
    return Promise.resolve(null);
  }

  return telegramSend(
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
  /* eslint-disable-next-line no-console */
  console.log('<6>starting process');
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

  /* eslint-disable-next-line no-console */
  console.log('<6>stopping process');
  telegramRoot('Stopping process', `Signal = ${signal}`).then(() => {
    quit(signal);
  });
}

process.on('uncaughtException', (error = {}) => {
  /* eslint-disable-next-line no-console */
  console.log(`<0>uncaughtException: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramRoot('uncaughtException', error.message, error.stack).then(() => {
    exit(1);
  });
});

process.on('unhandledRejection', (error = {}) => {
  /* eslint-disable-next-line no-console */
  console.log(`<0>unhandledRejection: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
  telegramRoot('unhandledRejection', error.message, error.stack);
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
