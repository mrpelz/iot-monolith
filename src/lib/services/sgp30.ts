import { Service } from '../device/main.js';

export type Sgp30Request = {
  humidity: number;
  temperature: number;
};

export type Sgp30Response = {
  eco2: number;
  ethanol: number;
  h2: number;
  tvoc: number;
};

export class Sgp30 extends Service<Sgp30Response, Sgp30Request> {
  constructor(index = 0) {
    super(Buffer.from([7, index]), 2000);
  }

  protected decode(input: Buffer): Sgp30Response | null {
    if (input.length < 8) return null;

    return {
      eco2: input.readUInt16LE(6),
      ethanol: input.readUInt16LE(2),
      h2: input.readUInt16LE(0),
      tvoc: input.readUInt16LE(4),
    };
  }

  protected encode(input: Sgp30Request): Buffer {
    const { humidity, temperature } = input;

    const request = Buffer.alloc(8);
    request.writeFloatLE(temperature, 0);
    request.writeFloatLE(humidity, 4);

    return request;
  }
}
