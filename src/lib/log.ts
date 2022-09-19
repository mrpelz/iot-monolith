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
  stack?: string;
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

const logMerge = (input: Log | string): Log =>
  typeof input === 'string'
    ? {
        body: input,
      }
    : input;

export class Output {
  private readonly _callback: Callback;

  readonly levels: Level[];

  constructor(logLevel: number, callback: Callback) {
    this.levels = [
      Level.EMERGENCY,
      Level.ALERT,
      Level.CRITICAL,
      Level.ERROR,
      Level.WARNING,
      Level.NOTICE,
      Level.INFO,
      Level.DEBUG,
    ].slice(0, logLevel + 1);

    this._callback = callback;
  }

  ingestLog(log: LogWithLevel): Promise<void> {
    if (!this.levels.includes(log.level)) {
      return Promise.resolve();
    }

    return this._callback(log);
  }
}

export class DevOutput extends Output {
  private static _callback({ body, head, level, stack }: LogWithLevel) {
    let output = `[${new Date().toLocaleTimeString('en', { hour12: false })}]`;
    output += `${logLevelNames[level]}:\t`;

    if (head) {
      output += `\t${head}`;
    }

    output += `\t${body}`;

    if (stack) {
      output += `\n${stack}`;
    }

    // eslint-disable-next-line no-console
    console.log(output);

    return Promise.resolve();
  }

  constructor(logLevel = 7) {
    super(logLevel, DevOutput._callback);
  }
}

export class JournaldOutput extends Output {
  private static _callback({ body, head, level, stack }: LogWithLevel) {
    let output = `<${level}>`;

    if (head) {
      output += ` ${head}`;
    }

    output += ` ${body}`;

    if (stack) {
      output += `\n${stack}`;
    }

    // eslint-disable-next-line no-console
    console.log(output);

    return Promise.resolve();
  }

  constructor(logLevel = 7) {
    super(logLevel, JournaldOutput._callback);
  }
}

// export class TelegramOutput extends Output {
//   private static _callback(log: LogWithLevel) {
//     return telegramSend(
//       [`*${logLevelNames[log.level]}*`, log.head, `\`${log.body}\``]
//         .filter(Boolean)
//         .join('  \n')
//     ).catch((reason) => {
//       // eslint-disable-next-line no-console
//       console.log(`<${Level.ERROR}>failed to log to Telegram: ${reason}`);
//     });
//   }

//   constructor(logLevel = 7) {
//     super(logLevel, TelegramOutput._callback);
//   }
// }

export class Input {
  private readonly _logger: Logger;
  private readonly _options: Partial<Log>;

  /**
   * DO NOT CALL YOURSELF, USE `Logger.getInput` INSTEAD
   */
  constructor(logger: Logger, options: Partial<Log>) {
    this._logger = logger;
    this._options = options;
  }

  private _log(level: Level, initiator: Initiator) {
    const stackLog =
      level <= Level.NOTICE
        ? {
            stack: new Error().stack,
          }
        : {};

    const amendedInitiator = () => {
      const log = logMerge(initiator());

      return {
        ...this._options,
        ...stackLog,
        ...log,
      };
    };

    return this._logger.log(level, amendedInitiator);
  }

  /* eslint-disable @typescript-eslint/member-ordering */
  emergency(initiator: Initiator): Promise<void> {
    return this._log(Level.EMERGENCY, initiator);
  }

  alert(initiator: Initiator): Promise<void> {
    return this._log(Level.ALERT, initiator);
  }

  critical(initiator: Initiator): Promise<void> {
    return this._log(Level.CRITICAL, initiator);
  }

  error(initiator: Initiator): Promise<void> {
    return this._log(Level.ERROR, initiator);
  }

  warning(initiator: Initiator): Promise<void> {
    return this._log(Level.WARNING, initiator);
  }

  notice(initiator: Initiator): Promise<void> {
    return this._log(Level.NOTICE, initiator);
  }

  info(initiator: Initiator): Promise<void> {
    return this._log(Level.INFO, initiator);
  }

  debug(initiator: Initiator): Promise<void> {
    return this._log(Level.DEBUG, initiator);
  }
  /* eslint-enable @typescript-eslint/member-ordering */

  removeInput(): void {
    this._logger.removeInput(this);
  }
}

export class Logger {
  private readonly _inputs = new Set<Input>();
  private readonly _outputs = new Set<Output>();

  private _shouldLog(level: Level) {
    return Boolean(
      [...this._outputs].find((output) => output.levels.includes(level))
    );
  }

  addOutput(output: Output): { remove: () => void } {
    this._outputs.add(output);

    return {
      remove: () => {
        this._outputs.delete(output);
      },
    };
  }

  getInput(options: Partial<Log>): Input {
    const input = new Input(this, options);

    this._inputs.add(input);

    return input;
  }

  log(level: Level, initiator: () => Log): Promise<void> {
    if (!this._shouldLog(level)) {
      return Promise.resolve();
    }

    const log = initiator();

    return Promise.allSettled(
      [...this._outputs].map((output) =>
        output.ingestLog({
          ...log,
          level,
        })
      )
    ).then(() => undefined);
  }

  removeInput(input: Input): void {
    this._inputs.delete(input);
  }
}
