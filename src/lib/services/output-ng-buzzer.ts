import { MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Service } from '../device/main.js';
import { request } from './output-ng-binary.js';

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
