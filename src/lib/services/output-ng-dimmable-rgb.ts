/* eslint-disable sort-keys */
import { DoubleLE, MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import { request } from './output-ng-binary.js';

const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  value: new MappedStruct({
    rampTime: new UIntLE(4),
    r: new DoubleLE(),
    g: new DoubleLE(),
    b: new DoubleLE(),
  }),
});

export type OutputDimmableRGBSequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputDimmableRGBRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputDimmableRGBSequenceItemRequest[];
};

export class OutputDimmableRGB extends Service<null, OutputDimmableRGBRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0f, index]));
  }

  protected encode({ iterations, sequence }: OutputDimmableRGBRequest): Buffer {
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
