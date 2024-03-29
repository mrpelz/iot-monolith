import { app } from './app/app.js';
import { callstack } from './lib/log.js';
import { logger as globalLogger } from './app/logging.js';

const logger = globalLogger.getInput({
  head: 'root',
});

process.stdin.resume();

logger.info(() => ({
  body: 'starting process',
}));

const quit = (code: number) => {
  process.nextTick(() => {
    process.exit(code);
  });
};

const exit = async (code = 0) => {
  process.removeListener('SIGINT', exit);
  process.removeListener('SIGTERM', exit);

  await logger.info(() => ({
    body: `stopping process with exit code "${code}"`,
  }));

  quit(code);
};

process.on('uncaughtException', async (cause) => {
  const error = new Error('uncaughtException', { cause });

  await logger.emergency(
    () => ({
      body: error.message,
      head: error.name,
    }),
    callstack(error)
  );

  exit();
});

process.on('unhandledRejection', async (cause) => {
  if (!cause) return;

  const error = new Error('uncaughtRejection', { cause });

  await logger.emergency(
    () => ({
      body: error.message,
      head: error.name,
    }),
    callstack(error)
  );

  exit();
});

export const handleSignal = async (signal: string): Promise<void> => {
  await logger.info(() => ({
    body: `received signal "${signal}"`,
  }));

  exit();
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

app();
