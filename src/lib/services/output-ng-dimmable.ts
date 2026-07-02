import { DoubleLE, MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import {
  BLINK_PERIOD_OFF,
  BLINK_PERIOD_ON,
  ITERATE_INFINITE,
  request,
} from './output-ng-binary.js';

const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  value: new MappedStruct({
    rampTime: new UIntLE(4),
    value: new DoubleLE(),
  }),
});

export type OutputDimmableSequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputDimmableRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputDimmableSequenceItemRequest[];
};

export class OutputDimmable extends Service<null, OutputDimmableRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0e, index]));
  }

  protected encode({ iterations, sequence }: OutputDimmableRequest): Buffer {
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

export const on = (): OutputDimmableRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, value: 1 },
    },
  ],
});

export const off = (): OutputDimmableRequest => ({
  iterations: 1,
  sequence: [
    {
      holdTime: 0,
      value: { rampTime: 0, value: 0 },
    },
  ],
});

export const RAMP_TIME = 300;

export const blink = (
  count = ITERATE_INFINITE,
  timeOn = BLINK_PERIOD_ON,
  timeOff = BLINK_PERIOD_OFF,
  rampTime = RAMP_TIME,
): OutputDimmableRequest => ({
  iterations: count,
  sequence: [
    {
      holdTime: timeOn + rampTime,
      value: { rampTime, value: 1 },
    },
    {
      holdTime: timeOff + rampTime,
      value: { rampTime, value: 0 },
    },
  ],
});
