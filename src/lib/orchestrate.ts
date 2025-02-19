import { AnyWritableObservable } from './observable.js';
import { sleep } from './sleep.js';

export type OrchestrationTimedStep<T> = [T, number];
export type OrchestrationTimedSteps<T> = OrchestrationTimedStep<T>[];

export type OrchestrationUniformSteps<T> = [number, T[]];

export type Orchestration<T> =
  | OrchestrationTimedSteps<T>
  | OrchestrationUniformSteps<T>;

const isOrchestrationTimedSteps = <T>(
  orchestration: Orchestration<T>,
): orchestration is OrchestrationTimedSteps<T> =>
  Array.isArray(orchestration[0]);

export const orchestrate =
  <T>(
    orchestration: Orchestration<T>,
    _includeEndSleep?: boolean,
  ): ((
    state: AnyWritableObservable<T>,
    includeEndSleep?: boolean,
  ) => Promise<void>) =>
  async (state, includeEndSleep = _includeEndSleep) => {
    let count = 1;

    if (isOrchestrationTimedSteps(orchestration)) {
      for (const [value, time] of orchestration) {
        count += 1;

        state.value = value;

        if (count === orchestration.length && !includeEndSleep) continue;

        // eslint-disable-next-line no-await-in-loop
        await sleep(time);
      }

      return;
    }

    const [time, values] = orchestration;

    for (const value of values) {
      count += 1;

      state.value = value;

      if (count === values.length && !includeEndSleep) continue;

      // eslint-disable-next-line no-await-in-loop
      await sleep(time);
    }
  };
