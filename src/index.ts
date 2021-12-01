import { app } from './app/app.js';
import { logger as globalLogger } from './app/logging.js';

const logger = globalLogger.getInput({
  head: 'root',
});

process.stdin.resume();

logger.info(() => ({
  body: 'starting process',
}));

function quit(code: number) {
  process.nextTick(() => {
    process.exit(code);
  });
}

async function exit(code = 0) {
  process.removeListener('SIGINT', exit);
  process.removeListener('SIGTERM', exit);
  process.removeListener('SIGUSR1', exit);
  process.removeListener('SIGUSR2', exit);

  await logger.info(() => ({
    body: `stopping process with exit code "${code}"`,
  }));

  quit(code);
}

process.on('uncaughtException', async (error) => {
  await logger.emergency(() => ({
    body: error.toString(),
    head: `uncaughtException: ${error.message}`,
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

export async function handleSignal(signal: string): Promise<void> {
  await logger.info(() => ({
    body: `received signal "${signal}"`,
  }));

  exit();
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

app();
