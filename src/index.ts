// eslint-disable-next-line spaced-comment
/// <reference path="../types.d.ts" />

import { app } from './app/app.js';
import { logTelegram } from './app/environment.js';
import { telegramSend } from './lib/telegram/simple.js';

Error.stackTraceLimit = 50;
process.stdin.resume();

function telegramRoot(title: string, message?: string, stack?: string) {
  if (!logTelegram) {
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
  }).catch((reason: string) => {
    /* eslint-disable-next-line no-console */
    console.log(`<3>${reason}`);

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

app();
