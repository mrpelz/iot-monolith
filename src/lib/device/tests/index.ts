import { Event, Service } from '../index.js';
import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { Schedule } from '../../schedule/index.js';
import { UDPDevice } from '../udp.js';
import { logger } from '../../../app/logging.js';

const log = logger.getInput({
  head: 'device-test',
});

class Hello extends Service<string> {
  constructor() {
    super(Buffer.from([1]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): string {
    return input.toString('ascii');
  }
}

class Mcp9808 extends Service<number> {
  constructor() {
    super(Buffer.from([4]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}

type Bme280Response = {
  humidity: number;
  pressure: number;
  temperature: number;
};
class Bme280 extends Service<Bme280Response> {
  constructor() {
    super(Buffer.from([5]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): Bme280Response | null {
    if (input.length < 12) return null;

    return {
      humidity: input.subarray(4, 8).readFloatLE(), // 2.
      pressure: input.subarray(8, 12).readFloatLE(), // 3.
      temperature: input.subarray(0, 4).readFloatLE(), // 1.
    };
  }
}

class Tsl2561 extends Service<number> {
  constructor() {
    super(Buffer.from([6]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}

class Veml6070 extends Service<number> {
  constructor() {
    super(Buffer.from([9]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): number | null {
    if (input.length < 2) return null;

    return input.readUInt16LE();
  }
}

type Sds011Response = {
  pm025: number;
  pm10: number;
};
class Sds011280 extends Service<Sds011Response> {
  constructor() {
    super(Buffer.from([10]), 35000);
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): Sds011Response | null {
    if (input.length < 8) return null;

    return {
      pm025: input.subarray(0, 4).readFloatLE(), // 1.
      pm10: input.subarray(4, 8).readFloatLE(), // 2.
    };
  }
}

type Mhz19Response = {
  accuracy: number;
  abc: boolean;
  co2: number;
  temperature: number;
  transmittance: number;
};
class Mhz19 extends Service<Mhz19Response> {
  constructor() {
    super(Buffer.from([11]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): Mhz19Response | null {
    if (input.length < 14) return null;

    return {
      abc: input.subarray(1, 2).readUInt8() !== 0, // 2.
      accuracy: input.subarray(0, 1).readUInt8(), // 1.
      co2: input.subarray(2, 6).readInt32LE(), // 3.
      temperature: input.subarray(6, 10).readFloatLE(), // 4.
      transmittance: input.subarray(10, 14).readFloatLE(), // 5.
    };
  }
}

const device = new UDPDevice('10.97.0.198', 8266);

const event = new Event<Buffer>(Buffer.from([0]));
device.addEvent(event);

const service1 = new Hello(); // hello
device.addService(service1);

const service2 = new Service(Buffer.from([2])); // systemInfo
device.addService(service2);

const service3 = new Service(Buffer.from([3]), 32000); // async
device.addService(service3);

const service4 = new Mcp9808(); // mcp9808
device.addService(service4);

const service5 = new Bme280(); // bme280
device.addService(service5);

const service6 = new Tsl2561(); // tsl2561
device.addService(service6);

const service7 = new Service(Buffer.from([7])); // sgp30
device.addService(service7);

const service8 = new Service(Buffer.from([8])); // ccs811
device.addService(service8);

const service9 = new Veml6070(); // veml6070
device.addService(service9);

const service10 = new Sds011280(); // sds011
device.addService(service10);

const service11 = new Mhz19(); // mhz19
device.addService(service11);

const every5Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 5).date,
  false
);

const every30Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 30).date,
  false
);

const every2Minutes = new Schedule(
  () => new ModifiableDate().ceil(Unit.MINUTE, 2).date,
  false
);

const onResolve = (description: string, result: unknown) => {
  log.info(
    () =>
      `${description} ${JSON.stringify(
        result instanceof Buffer
          ? [...result].map((byte) => byte.toString(16)).join(',')
          : result
      )}`
  );
};

const onReject = (description: string) => {
  log.info(() => `${description} failed`);
};

every5Seconds.addTask(() => {
  log.info(() => '⏲ every5Seconds');

  service4
    .request()
    .then((result) => onResolve('✅ mcp9808', result))
    .catch(() => onReject('⛔️ mcp9808'));

  service5
    .request()
    .then((result) => onResolve('✅ bme280', result))
    .catch(() => onReject('⛔️ bme280'));

  service6
    .request()
    .then((result) => onResolve('✅ tsl2561', result))
    .catch(() => onReject('⛔️ tsl256'));

  service9
    .request()
    .then((result) => onResolve('✅ veml6070', result))
    .catch(() => onReject('⛔️ veml60'));
});

every30Seconds.addTask(() => {
  log.info(() => '⏲ every30Seconds');

  service1
    .request()
    .then((result) => onResolve('✅ hello', result))
    .catch(() => onReject('⛔️ hello'));

  service2
    .request()
    .then((result) => onResolve('✅ systemInfo', result))
    .catch(() => onReject('⛔️ system'));

  service11
    .request()
    .then((result) => onResolve('✅ mhz19', result))
    .catch(() => onReject('⛔️ mhz19'));
});

every2Minutes.addTask(() => {
  log.info(() => '⏲ every2Minutes');

  service3
    .request()
    .then((result) => onResolve('✅ async', result))
    .catch(() => onReject('⛔️ async'));

  service10
    .request()
    .then((result) => onResolve('✅ sds011', result))
    .catch(() => onReject('⛔️ sds011'));
});

device.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ offline');

    every5Seconds.stop();
    every30Seconds.stop();
    every2Minutes.stop();

    return;
  }

  log.info(() => '📶 online');

  every5Seconds.start();
  every30Seconds.start();
  every2Minutes.start();
});

event.observe((data) => {
  log.info(() => `event ${data ? data.toString() : data}`);
});
