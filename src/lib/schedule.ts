import { Observable, ReadOnlyObservable } from '@mrpelz/observable';

import { callstack, Input, Logger } from './log.js';

export type ScheduleEpochPair = [Schedule, number];

type Task = (previousExecution: Date | null) => void;

type TaskRemove = {
  remove: () => void;
};

type NextExecutionProvider = (
  previousExecution: Date | undefined,
) => Date | null;

const MAX_TIMEOUT = 2_147_483_647;

export class Schedule {
  private readonly _log: Input;
  private readonly _nextExecution = new Observable<Date | null>(null);
  private readonly _nextExecutionProvider: NextExecutionProvider;
  private readonly _once: boolean;
  private _previousExecution: Date | null = null;
  private readonly _tasks = new Set<Task>();
  private _timeout: NodeJS.Timeout | null = null;

  readonly nextExecution: ReadOnlyObservable<Date | null>;

  constructor(
    logger: Logger,
    nextExecutionProvider: NextExecutionProvider,
    start = true,
    once = false,
  ) {
    this._log = logger.getInput({ head: this.constructor.name });
    this._nextExecutionProvider = nextExecutionProvider;
    this._once = once;

    this.nextExecution = new ReadOnlyObservable(this._nextExecution);

    if (!start) return;
    this.start();
  }

  private _run() {
    try {
      for (const task of this._tasks) {
        task(this._previousExecution);
      }
    } catch (_error) {
      const error = new Error('task error', { cause: _error });

      this._log.error(() => error.message, callstack(error));
    }
  }

  private _scheduleNextExecution(carriedOverExecution?: Date) {
    const nextExecution =
      carriedOverExecution ||
      this._nextExecutionProvider(this._previousExecution || undefined);

    this._nextExecution.value = nextExecution;
    const now = Date.now();

    if (!nextExecution || nextExecution.getTime() < now) {
      this._log.error(
        () => ({
          body: 'next execution missing or not in the future, stopping execution',
        }),
        callstack(),
      );

      this._previousExecution = null;
      this.stop();

      return;
    }

    const timeUntilNextExecution = nextExecution.getTime() - now;

    if (timeUntilNextExecution > MAX_TIMEOUT) {
      this._timeout = setTimeout(
        () => this._scheduleNextExecution(nextExecution),
        MAX_TIMEOUT,
      );

      return;
    }

    this._timeout = setTimeout(() => {
      this._previousExecution = nextExecution;
      this.stop();

      this._run();

      if (!this._once) {
        this._scheduleNextExecution();
      }
    }, timeUntilNextExecution);
  }

  addTask(task: Task): TaskRemove {
    this._tasks.add(task);

    return {
      remove: () => this._tasks.delete(task),
    };
  }

  start(): void {
    this._scheduleNextExecution();
  }

  stop(): void {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
      this._nextExecution.value = null;
    }
  }
}
