// eslint-disable-next-line spaced-comment
/// <reference path="../types.d.ts" />

Error.stackTraceLimit = 50;
process.stdin.resume();

import { parseString } from './lib/utils/string.js';

const env = {} as IoT.Environment;

(function populateEnvVars() {
  const { CONFIG_PATH, LOG_LEVEL, LOG_TELEGRAM, PROD_ENV, TELEGRAM_TOKEN } = process.env;

  if (!CONFIG_PATH || !CONFIG_PATH.length) {
    throw new Error('no path to configuration files provided');
  }

  const configPath = CONFIG_PATH;
  const isProd = PROD_ENV ? Boolean(parseString(PROD_ENV)) : false;
  const logLevel = LOG_LEVEL ? parseString(LOG_LEVEL) : 0;
  const logTelegram = LOG_TELEGRAM ? Boolean(parseString(LOG_TELEGRAM)) : false;
  const telegramToken = TELEGRAM_TOKEN;

  Object.assign(env, {
    configPath,
    telegramToken
  });

  Object.assign(global, {
    isProd,
    logLevel,
    logTelegram,
    telegramToken
  });
}());

(async function run() {
  const [
    {
      app
    },
    {
      telegramSend
    }
  ] = await Promise.all([
    import('./app/app.js'),
    import('./lib/telegram/simple.js')
  ]).catch(() => {
    process.exit(1);
  });

  function telegramRoot(title: string, message?: string, stack?: string) {
    if (!global.logTelegram) {
      return Promise.resolve(null);
    }

    return telegramSend(
      [
        '*ROOT*',
        `_${title || ''}_`,
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

  function quit(signal: number) {
    process.nextTick(() => {
      process.exit(signal);
    });
  }

  function exit(signal: number = 0) {
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

  process.on('uncaughtException', (error) => {
    /* eslint-disable-next-line no-console */
    console.log(`<0>uncaughtException: ${error.message}${error.stack ? `\n${error.stack}` : ''}`);
    telegramRoot('uncaughtException', error.message, error.stack).then(() => {
      exit();
    });
  });

  process.on('unhandledRejection', (error) => {
    if (!error) return;

    /* eslint-disable-next-line no-console */
    console.log(`<0>unhandledRejection: ${error}`);
    telegramRoot('unhandledRejection', error.toString());
  });

  process.on('SIGINT', exit);
  process.on('SIGTERM', exit);
  process.on('SIGUSR1', exit);
  process.on('SIGUSR2', exit);

  app(env);
}());
