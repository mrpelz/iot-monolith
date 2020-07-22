type Task = (previousExecution: Date | null) => void;

type TaskRemove = {
  remove: () => void;
};

type NextExecutionProvider = (previousExecution: Date | null) => Date | null;

const MAX_TIMEOUT = 2147483647;

export class Schedule {
  private readonly nextExecutionProvider: NextExecutionProvider;

  private readonly once: boolean;

  private previousExecution: Date | null;

  private readonly tasks = new Set<Task>();

  private timeout: NodeJS.Timeout | null = null;

  constructor(nextExecutionProvider: NextExecutionProvider, once = false) {
    this.nextExecutionProvider = nextExecutionProvider;
    this.once = once;

    this.scheduleNextExecution();
  }

  private run() {
    this.tasks.forEach((task) => task(this.previousExecution));
  }

  private scheduleNextExecution(carriedOverExecution?: Date) {
    const nextExecution =
      carriedOverExecution ||
      this.nextExecutionProvider(this.previousExecution);

    const now = Date.now();

    if (!nextExecution || nextExecution.getTime() < now) {
      this.previousExecution = null;
      this.stop();

      return;
    }

    const timeUntilNextExecution = nextExecution.getTime() - now;

    if (timeUntilNextExecution > MAX_TIMEOUT) {
      this.timeout = setTimeout(
        () => this.scheduleNextExecution(nextExecution),
        MAX_TIMEOUT
      );

      return;
    }

    this.timeout = setTimeout(() => {
      this.previousExecution = nextExecution;
      this.stop();

      this.run();

      if (this.once) return;

      this.scheduleNextExecution();
    }, timeUntilNextExecution);
  }

  addTask(task: Task): TaskRemove {
    this.tasks.add(task);

    return {
      remove: () => this.tasks.delete(task),
    };
  }

  stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
