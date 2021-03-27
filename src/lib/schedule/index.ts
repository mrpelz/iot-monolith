type Task = (previousExecution: Date | null) => void;

type TaskRemove = {
  remove: () => void;
};

type NextExecutionProvider = (previousExecution: Date | null) => Date | null;

const MAX_TIMEOUT = 2147483647;

export class Schedule {
  private readonly _nextExecutionProvider: NextExecutionProvider;
  private readonly _once: boolean;
  private readonly _tasks = new Set<Task>();

  private _previousExecution: Date | null;
  private _timeout: NodeJS.Timeout | null = null;

  constructor(nextExecutionProvider: NextExecutionProvider, once = false) {
    this._nextExecutionProvider = nextExecutionProvider;
    this._once = once;

    this._scheduleNextExecution();
  }

  private _run() {
    this._tasks.forEach((task) => task(this._previousExecution));
  }

  private _scheduleNextExecution(carriedOverExecution?: Date) {
    const nextExecution =
      carriedOverExecution ||
      this._nextExecutionProvider(this._previousExecution);

    const now = Date.now();

    if (!nextExecution || nextExecution.getTime() < now) {
      this._previousExecution = null;
      this.stop();

      return;
    }

    const timeUntilNextExecution = nextExecution.getTime() - now;

    if (timeUntilNextExecution > MAX_TIMEOUT) {
      this._timeout = setTimeout(
        () => this._scheduleNextExecution(nextExecution),
        MAX_TIMEOUT
      );

      return;
    }

    this._timeout = setTimeout(() => {
      this._previousExecution = nextExecution;
      this.stop();

      this._run();

      if (this._once) return;

      this._scheduleNextExecution();
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
    }
  }
}
