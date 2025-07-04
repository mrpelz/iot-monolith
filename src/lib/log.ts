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
  level: Level | CustomLevel;
};

export type Initiator = () => Log | string;

export type Callback = (log: LogWithLevel) => Promise<void>;

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

export class CustomLevel {
  constructor(readonly level: Level) {}
}

export class Output {
  private readonly _callback: Callback;

  readonly customLevel?: CustomLevel;
  readonly levels: Level[];

  constructor(logLevel: Level | CustomLevel, callback: Callback) {
    this.customLevel = logLevel instanceof CustomLevel ? logLevel : undefined;

    this.levels = [
      Level.EMERGENCY,
      Level.ALERT,
      Level.CRITICAL,
      Level.ERROR,
      Level.WARNING,
      Level.NOTICE,
      Level.INFO,
      Level.DEBUG,
    ].slice(
      0,
      (logLevel instanceof CustomLevel ? logLevel.level : logLevel) + 1,
    );

    this._callback = callback;
  }

  ingestLog(log: LogWithLevel): Promise<void> {
    const { level } = log;
    if (this.customLevel && this.customLevel !== level) {
      return Promise.resolve();
    }

    if (!(level instanceof CustomLevel) && !this.levels.includes(level)) {
      return Promise.resolve();
    }

    return this._callback({
      ...log,
      level: level instanceof CustomLevel ? level.level : level,
    });
  }
}

export class DevOutput extends Output {
  private static _callback({ body, head, level, stack }: LogWithLevel) {
    let output = `[${new Date().toLocaleTimeString('en', { hour12: false })}]`;
    output += `${logLevelNames[level instanceof CustomLevel ? level.level : level]}:\t`;

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

  constructor(logLevel: Level | CustomLevel = Level.DEBUG) {
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

  constructor(logLevel: Level | CustomLevel = Level.DEBUG) {
    super(logLevel, JournaldOutput._callback);
  }
}

export class VirtualOutput extends Output {
  private static _callback(logs: Map<Date, LogWithLevel>) {
    return (log: LogWithLevel) => {
      const date = new Date();

      logs.set(date, log);

      return Promise.resolve();
    };
  }

  private readonly _logs: Map<Date, LogWithLevel>;

  constructor(logLevel: Level | CustomLevel = Level.DEBUG) {
    const logs = new Map<Date, LogWithLevel>();

    super(logLevel, VirtualOutput._callback(logs));

    this._logs = logs;
  }

  get logs(): [Date, Log][] {
    return Array.from(this._logs);
  }
}

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

  log(
    level: Level | CustomLevel,
    initiator: Initiator,
    stack?: string,
  ): Promise<void> {
    const effectiveLevel = level instanceof CustomLevel ? level.level : level;

    const stackLog =
      effectiveLevel <= Level.NOTICE && stack
        ? {
            stack,
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
  emergency(initiator: Initiator, stack: string | undefined): Promise<void> {
    return this.log(Level.EMERGENCY, initiator, stack);
  }

  alert(initiator: Initiator, stack: string | undefined): Promise<void> {
    return this.log(Level.ALERT, initiator, stack);
  }

  critical(initiator: Initiator, stack: string | undefined): Promise<void> {
    return this.log(Level.CRITICAL, initiator, stack);
  }

  error(initiator: Initiator, stack: string | undefined): Promise<void> {
    return this.log(Level.ERROR, initiator, stack);
  }

  warning(initiator: Initiator, stack: string | undefined): Promise<void> {
    return this.log(Level.WARNING, initiator, stack);
  }

  notice(initiator: Initiator, stack?: string): Promise<void> {
    return this.log(Level.NOTICE, initiator, stack);
  }

  info(initiator: Initiator, stack?: string): Promise<void> {
    return this.log(Level.INFO, initiator, stack);
  }

  debug(initiator: Initiator, stack?: string): Promise<void> {
    return this.log(Level.DEBUG, initiator, stack);
  }
  /* eslint-enable @typescript-eslint/member-ordering */

  removeInput(): void {
    this._logger.removeInput(this);
  }
}

export class Logger {
  private readonly _inputs = new Set<Input>();
  private readonly _outputs = new Set<Output>();

  private _shouldLog(level: Level | CustomLevel) {
    return [...this._outputs].some((output) =>
      output.levels.includes(
        level instanceof CustomLevel ? level.level : level,
      ),
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

  log(level: Level | CustomLevel, initiator: () => Log): Promise<void> {
    if (!this._shouldLog(level)) {
      return Promise.resolve();
    }

    const log = initiator();

    return Promise.allSettled(
      [...this._outputs].map((output) =>
        output.ingestLog({
          level,
          ...log,
        }),
      ),
    ).then(() => undefined);
  }

  removeInput(input: Input): void {
    this._inputs.delete(input);
  }
}

export const makeCustomStringLogger =
  (log: Input, level: CustomLevel): ((value: string) => void) =>
  (value: string) => {
    log.log(level, () => value);
  };

export const callstack = (error?: Error): string | undefined =>
  // eslint-disable-next-line unicorn/error-message
  (error || new Error()).stack
    ?.split('\n')
    .splice(2)
    .map((line) => line.trim())
    .join('\n');
