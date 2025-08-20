/* eslint-disable @typescript-eslint/member-ordering */

import { Struct, UInt8, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';

export type IndicatorSequenceItem = {
  value: number;
  time: number;
  rampTime?: number;
};

export type IndicatorRequest = {
  iterations?: number;
  sequence: IndicatorSequenceItem[];
};

const iterationsRequest = new UInt8();
const sequenceItemRequest = new Struct(
  new UInt8(),
  new UIntLE(4),
  new UIntLE(4),
);

export class Indicator extends Service<null, IndicatorRequest> {
  constructor(index: number) {
    super(Buffer.from([0xc0, index]));
  }

  protected encode({ iterations = 1, sequence }: IndicatorRequest): Buffer {
    return Buffer.concat(
      [
        iterationsRequest.encode(iterations),
        Buffer.concat(
          sequence.map(({ value, time, rampTime = 0 }) =>
            sequenceItemRequest.encode([value, time, rampTime]),
          ),
          sequenceItemRequest.size * sequence.length,
        ),
      ],
      iterationsRequest.size + sequenceItemRequest.size * sequence.length,
    );
  }
}

export const blink = (
  count = 1,
  value = 1,
  onTime = 64,
  offTime = 128,
): IndicatorRequest => ({
  iterations: count,
  sequence: [
    {
      time: onTime,
      value,
    },
    {
      time: offTime,
      value: 0,
    },
  ],
});
