/* eslint-disable sort-keys */

import { Bool, MappedStruct, TStruct, UInt8, UIntLE } from '../struct/main.js';
import { Event } from '../device/main.js';
import { bufferChunks } from '../data.js';

const payload = new MappedStruct({
  down: new Bool(),
  downChanged: new Bool(),
  repeat: new UInt8(),
  longpress: new UInt8(),
  previousDuration: new UIntLE(4),
});

const pressedMapItem = new Bool();

export type ButtonPayload = TStruct<typeof payload> & {
  pressedMap: (typeof pressedMapItem.value)[];
};

export class Button extends Event<ButtonPayload> {
  constructor(index: number) {
    super(Buffer.from([0, index]));
  }

  protected decode(input: Buffer): ButtonPayload | null {
    try {
      const [partialResult, pressedMap] = payload.decodeOpenended(input);
      return {
        ...partialResult,
        pressedMap: bufferChunks(pressedMap, pressedMapItem.size).map((chunk) =>
          pressedMapItem.decode(chunk)
        ),
      };
    } catch {
      return null;
    }
  }
}
