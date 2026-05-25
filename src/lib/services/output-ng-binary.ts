import {
  Bool,
  DynamicBuffer,
  MappedDynamicStruct,
  MappedStruct,
  TStruct,
  UIntLE,
} from '@mrpelz/struct';

import { Service } from '../device/main.js';

export const request = new MappedDynamicStruct({
  iterations: new UIntLE(4),
  sequence: new DynamicBuffer(),
});
const sequenceItemRequest = new MappedStruct({
  holdTime: new UIntLE(4),
  value: new Bool(),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type OutputBinarySequenceItemRequest = TStruct<
  typeof sequenceItemRequest
>;

export type OutputBinaryRequest = {
  iterations: typeof request.value.iterations;
  sequence: OutputBinarySequenceItemRequest[];
};

export class OutputBinary extends Service<null, OutputBinaryRequest> {
  constructor(index: number) {
    super(Buffer.from([0x0c, index]));
  }

  protected encode({ iterations, sequence }: OutputBinaryRequest): Buffer {
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
