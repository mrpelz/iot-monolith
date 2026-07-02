import { MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import { ITERATE_INFINITE, request } from './output-ng-binary.js';

const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  value: new MappedStruct({
    rampTime: new UIntLE(4),
    value: new UIntLE(4),
  }),
});

export type OutputBuzzerSequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputBuzzerRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputBuzzerSequenceItemRequest[];
};

export class OutputBuzzer extends Service<null, OutputBuzzerRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0d, index]));
  }

  protected encode({ iterations, sequence }: OutputBuzzerRequest): Buffer {
    const sequenceRequest = Buffer.concat(
      sequence.map((item) => sequenceItemRequest.encode(item)),
      sequenceItemRequest.size * sequence.length,
    );

    const result = request.encode({
      iterations,
      sequence: sequenceRequest,
    });

    return result;
  }
}

export const tone = (frequency: number): OutputBuzzerRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, value: frequency },
    },
  ],
});

export const BUZZER_DEFAULT_FREQUENCY = 3750;
export const BUZZER_DEFAULT_HOLD_TIME = 125;
export const BUZZER_DEFAULT_PAUSE_TIME = 375;

export const beep = (
  count = ITERATE_INFINITE,
  frequency = BUZZER_DEFAULT_FREQUENCY,
  holdTime = BUZZER_DEFAULT_HOLD_TIME,
  pauseTime = BUZZER_DEFAULT_PAUSE_TIME,
): OutputBuzzerRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime,
      value: { rampTime: 0, value: frequency },
    },
    {
      holdTime: pauseTime,
      value: { rampTime: 0, value: 0 },
    },
  ],
});

export const melody = (
  melody_: number[],
  count = 1,
  holdTime = BUZZER_DEFAULT_HOLD_TIME,
  pauseTime = BUZZER_DEFAULT_PAUSE_TIME,
): OutputBuzzerRequest => {
  const sequence: OutputBuzzerSequenceItemRequest[] = [];

  for (const item of melody_) {
    if (holdTime) {
      sequence.push({ holdTime, value: { rampTime: 0, value: item } });
    }

    sequence.push({ holdTime: pauseTime, value: { rampTime: 0, value: 0 } });
  }

  return {
    iterations: count,
    sequence,
  };
};
