import { Bool, MappedStruct, TStruct, UIntLE } from '@mrpelz/struct';

import { Event } from '../device/main.js';

const payloadStageOne = new MappedStruct({
  isIterating: new Bool(),
});

const payloadStageTwo = new MappedStruct({
  remainingIterations: new UIntLE(4),
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type OutputNgProgressPayload = TStruct<typeof payloadStageOne> &
  Partial<TStruct<typeof payloadStageTwo>>;

export class OutputNgProgress extends Event<OutputNgProgressPayload> {
  protected decode(input: Buffer): OutputNgProgressPayload | null {
    try {
      const [{ isIterating }, rest] = payloadStageOne.decodeOpenended(input);
      const { remainingIterations } =
        rest.length > 0 ? payloadStageTwo.decode(rest) : {};

      return { isIterating, remainingIterations };
    } catch {
      return null;
    }
  }
}

export class OutputNgBinaryProgress extends OutputNgProgress {
  constructor(index: number) {
    super(Buffer.from([0x0c, index]));
  }
}

export class OutputNgBuzzerProgress extends OutputNgProgress {
  constructor(index: number) {
    super(Buffer.from([0x0d, index]));
  }
}

export class OutputNgDimmableProgress extends OutputNgProgress {
  constructor(index: number) {
    super(Buffer.from([0x0e, index]));
  }
}

export class OutputNgDimmableRGBProgress extends OutputNgProgress {
  constructor(index: number) {
    super(Buffer.from([0x0f, index]));
  }
}
