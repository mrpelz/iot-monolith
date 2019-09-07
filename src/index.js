Error.stackTraceLimit = 50;
process.stdin.resume();

const { telegramSend } = require('./lib/telegram/simple');
const { parseString } = require('./lib/utils/string');

const env = {};

(function populateEnvVars() {
  const { CONFIG_PATH, LOG_LEVEL, LOG_TELEGRAM, PROD_ENV, TELEGRAM_TOKEN } = process.env;

  if (!CONFIG_PATH || !CONFIG_PATH.length) {
    throw new Error('no path to configuration files provided');
  }

  const configPath = CONFIG_PATH;
  const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
  const logLevel = parseString(LOG_LEVEL);
  const logTelegram = LOG_TELEGRAM ? Boolean(parseString(LOG_TELEGRAM)) : false;
  const telegramToken = TELEGRAM_TOKEN;

  Object.assign(env, {
    configPath,
    isProd,
    logLevel,
    logTelegram,
    telegramToken
  });
}());

function telegramRoot(title = '', message, stack) {
  if (!env.logTelegram) {
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

const app = require('./app/app');

app(env);
