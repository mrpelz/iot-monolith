import { app } from './app/app.js';
import { logger as globalLogger } from './app/logging.js';

const logger = globalLogger.getInput({
  head: 'root',
});

Error.stackTraceLimit = 50;
process.stdin.resume();

logger.info(() => ({
  body: 'starting process',
}));

function quit(signal: number) {
  process.nextTick(() => {
    process.exit(signal);
  });
}

async function exit(signal = 0) {
  process.removeListener('SIGINT', exit);
  process.removeListener('SIGTERM', exit);
  process.removeListener('SIGUSR1', exit);
  process.removeListener('SIGUSR2', exit);

  await logger.info(() => ({
    body: `stopping process (signal=${signal})`,
  }));

  quit(signal);
}

process.on('uncaughtException', async (error) => {
  await logger.emergency(() => ({
    body: `uncaughtException: ${error.message}`,
  }));

  exit();
});

process.on('unhandledRejection', async (error) => {
  if (!error) return;

  await logger.emergency(() => ({
    body: `uncaughtRejection: ${error.toString()}`,
  }));

  exit();
});

process.on('SIGINT', exit);
process.on('SIGTERM', exit);
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);

app();
