import { Service } from '../device/main.js';

export type Ccs811Request = {
  humidity: number;
  temperature: number;
};

export type Ccs811Response = {
  eco2: number;
  temperature: number;
  tvoc: number;
};

export class Ccs811 extends Service<Ccs811Response, Ccs811Request> {
  constructor(index = 0) {
    super(Buffer.from([8, index]), 2000);
  }

  protected decode(input: Buffer): Ccs811Response | null {
    if (input.length < 8) return null;

    return {
      eco2: input.readUInt16LE(4),
      temperature: input.readUInt16LE(0),
      tvoc: input.readUInt16LE(2),
    };
  }

  protected encode(input: Ccs811Request): Buffer {
    const { humidity, temperature } = input;

    const request = Buffer.alloc(8);
    request.writeFloatLE(temperature, 0);
    request.writeFloatLE(humidity, 4);

    return request;
  }
}
