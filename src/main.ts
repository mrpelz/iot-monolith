import { app } from './app/app.js';
import { logger as globalLogger } from './app/logging.js';
import type { TSystem as TSystem_ } from './app/tree/system.js';
import { callstack } from './lib/log.js';
import type { ElementSerialization } from './lib/tree/operations/serialization.js';

export type TSystem = TSystem_;
export type TSerialization = ElementSerialization<TSystem>;
export * from './lib/tree/main.js';
export * from './lib/oop.js';

const logger = globalLogger.getInput({
  head: 'root',
});

process.stdin.resume();

logger.info(() => ({
  body: 'starting process',
}));

const quit = (code: number) => {
  process.nextTick(() => {
    // eslint-disable-next-line unicorn/no-process-exit
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
  const error =
    cause instanceof Error ? cause : new Error('uncaughtException', { cause });

  await logger.emergency(
    () => ({
      body: error.message,
      head: error.name,
    }),
    callstack(error),
  );

  exit();
});

process.on('unhandledRejection', async (cause) => {
  if (!cause) return;

  const error =
    cause instanceof Error ? cause : new Error('uncaughtRejection', { cause });

  await logger.emergency(
    () => ({
      body: error.message,
      head: error.name,
    }),
    callstack(error),
  );

  exit();
});

const handleSignal = async (signal: string): Promise<void> => {
  await logger.info(() => ({
    body: `received signal "${signal}"`,
  }));

  exit();
};

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

app();
