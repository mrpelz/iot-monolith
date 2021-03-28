import { telegramSend } from '../telegram/simple.js';

export enum Level {
  EMERGENCY,
  ALERT,
  CRITICAL,
  ERROR,
  WARNING,
  NOTICE,
  INFO,
  DEBUG,
}

export type Log = {
  body: string;
  head?: string;
};

export type LogWithLevel = Log & {
  level: Level;
};

export type Initiator = () => Log | string;

export type Callback = (log: Log) => Promise<void>;

const logLevelNames = [
  'EMERGENCY',
  'ALERT',
  'CRITICAL',
  'ERROR',
  'WARNING',
  'NOTICE',
  'INFO',
  'DEBUG',
];

function logMerge(input: Log | string): Log {
  if (typeof input === 'string') {
    return {
      body: input,
    };
  }

  return input;
}

export class Output {
  private callback: Callback;

  levels: Level[];

  constructor(levels: Level[], callback: Callback) {
    this.levels = levels;
    this.callback = callback;
  }

  ingestLog(log: LogWithLevel): Promise<void> {
    if (!this.levels.includes(log.level)) {
      return Promise.resolve();
    }

    return this.callback(log);
  }
}

export class DevOutput extends Output {
  constructor() {
    super(
      [
        Level.EMERGENCY,
        Level.ALERT,
        Level.CRITICAL,
        Level.ERROR,
        Level.WARNING,
        Level.NOTICE,
        Level.INFO,
      ],
      DevOutput.callback
    );
  }

  private static callback(log: LogWithLevel) {
    // eslint-disable-next-line no-console
    console.log(
      `[${new Date().toLocaleTimeString('en', { hour12: false })}] ${
        logLevelNames[log.level]
      }:\t${log.head ? `${log.head}:` : ''}\t${log.body}`
    );

    return Promise.resolve();
  }
}

export class JournaldOutput extends Output {
  constructor() {
    super(
      [
        Level.EMERGENCY,
        Level.ALERT,
        Level.CRITICAL,
        Level.ERROR,
        Level.WARNING,
        Level.NOTICE,
        Level.INFO,
      ],
      JournaldOutput.callback
    );
  }

  private static callback(log: LogWithLevel) {
    // eslint-disable-next-line no-console
    console.log(`<${log.level}>${log.head ? `${log.head}:` : ''} ${log.body}`);

    return Promise.resolve();
  }
}

export class TelegramOutput extends Output {
  constructor() {
    super(
      [
        Level.EMERGENCY,
        Level.ALERT,
        Level.CRITICAL,
        Level.ERROR,
        Level.WARNING,
      ],
      TelegramOutput.callback
    );
  }

  private static callback(log: LogWithLevel) {
    return telegramSend(
      [`*${logLevelNames[log.level]}*`, log.head, `\`${log.body}\``]
        .filter(Boolean)
        .join('  \n')
    ).catch((reason) => {
      // eslint-disable-next-line no-console
      console.log(`<${Level.ERROR}>failed to log to Telegram: ${reason}`);
    });
  }
}

class Input {
  private logger: Logger;

  private options: Partial<Log>;

  /**
   * DO NOT CALL YOURSELF, USE `Logger.getInput` INSTEAD
   */
  constructor(logger: Logger, options: Partial<Log>) {
    this.logger = logger;
    this.options = options;
  }

  private log(level: Level, initiator: Initiator) {
    const amendedInitiator = () => {
      const log = logMerge(initiator());

      return {
        ...this.options,
        ...log,
      };
    };

    return this.logger.log(level, amendedInitiator);
  }

  emergency(initiator: Initiator): Promise<void> {
    return this.log(Level.EMERGENCY, initiator);
  }

  alert(initiator: Initiator): Promise<void> {
    return this.log(Level.ALERT, initiator);
  }

  critical(initiator: Initiator): Promise<void> {
    return this.log(Level.CRITICAL, initiator);
  }

  error(initiator: Initiator): Promise<void> {
    return this.log(Level.ERROR, initiator);
  }

  warning(initiator: Initiator): Promise<void> {
    return this.log(Level.WARNING, initiator);
  }

  notice(initiator: Initiator): Promise<void> {
    return this.log(Level.NOTICE, initiator);
  }

  info(initiator: Initiator): Promise<void> {
    return this.log(Level.INFO, initiator);
  }

  debug(initiator: Initiator): Promise<void> {
    return this.log(Level.DEBUG, initiator);
  }

  removeInput(): void {
    this.logger.removeInput(this);
  }
}

export class Logger {
  private inputs = new Set<Input>();

  private outputs = new Set<Output>();

  private shouldLog(level: Level) {
    return Boolean(
      [...this.outputs].find((output) =>
        Boolean(output.levels.find((outputLevel) => outputLevel === level))
      )
    );
  }

  addOutput(output: Output): { remove: () => void } {
    this.outputs.add(output);

    return {
      remove: () => {
        this.outputs.delete(output);
      },
    };
  }

  getInput(options: Partial<Log>): Input {
    const input = new Input(this, options);

    this.inputs.add(input);

    return input;
  }

  log(level: Level, initiator: () => Log): Promise<void> {
    if (!this.shouldLog(level)) {
      return Promise.resolve();
    }

    const log = initiator();

    return Promise.allSettled(
      [...this.outputs].map((output) =>
        output.ingestLog({
          ...log,
          level,
        })
      )
    ).then(() => undefined);
  }

  removeInput(input: Input): void {
    this.inputs.delete(input);
  }
}

type _Input = ReturnType<Logger['getInput']>;
export { _Input as Input };
