import {
  BooleanGroupStrategy,
  BooleanStateGroup,
} from '../../state-group/index.js';
import { Event, Service } from '../index.js';
import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { Schedule } from '../../schedule/index.js';
import { UDPDevice } from '../udp.js';
import { logger } from '../../../app/logging.js';

const log = logger.getInput({
  head: 'device-test',
});

const wt32TestBoard = new UDPDevice('10.97.0.198', 8266);
const shelly1 = new UDPDevice('10.97.0.199', 8266);
const obiJack = new UDPDevice('10.97.0.159', 8266);

const isOnline = new BooleanStateGroup(
  BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
  wt32TestBoard.isOnline,
  shelly1.isOnline,
  obiJack.isOnline
);

let on = false;

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
  abc: boolean;
  accuracy: number;
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

class Relay extends Service<null> {
  constructor() {
    super(Buffer.from([0xa0]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected encode(input: boolean): Buffer {
    return Buffer.from([input ? 1 : 0]);
  }
}

type ButtonEvent = {
  down: boolean;
  downChanged: boolean;
  longpress: number;
  previousDuration: number;
  repeat: number;
};
class Button extends Event<ButtonEvent> {
  constructor() {
    super(Buffer.from([0]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): ButtonEvent | null {
    if (input.length < 8) return null;

    return {
      down: input.subarray(0, 1).readUInt8() !== 0, // 1.
      downChanged: input.subarray(1, 2).readUInt8() !== 0, // 2.
      longpress: input.subarray(3, 4).readUInt8(), // 4.
      previousDuration: input.subarray(4, 10).readUInt32LE(), // 5.
      repeat: input.subarray(2, 3).readUInt8(), // 3.
    };
  }
}

class MotionSensor extends Event<boolean> {
  constructor() {
    super(Buffer.from([0xa0]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): boolean | null {
    if (!input.length) return null;

    return input[0] !== 0;
  }
}

const hello0 = new Hello(); // hello
wt32TestBoard.addService(hello0);

const hello1 = new Hello(); // hello
shelly1.addService(hello1);

const hello2 = new Hello(); // hello
obiJack.addService(hello2);

const async = new Service(Buffer.from([3]), 32000); // async
wt32TestBoard.addService(async);

const mcp9808 = new Mcp9808(); // mcp9808
wt32TestBoard.addService(mcp9808);

const bme280 = new Bme280(); // bme280
wt32TestBoard.addService(bme280);

const tsl2561 = new Tsl2561(); // tsl2561
wt32TestBoard.addService(tsl2561);

const sgp30 = new Service(Buffer.from([7])); // sgp30
wt32TestBoard.addService(sgp30);

const ccs811 = new Service(Buffer.from([8])); // ccs811
wt32TestBoard.addService(ccs811);

const veml6070 = new Veml6070(); // veml6070
wt32TestBoard.addService(veml6070);

const sds011 = new Sds011280(); // sds011
wt32TestBoard.addService(sds011);

const mhz19 = new Mhz19(); // mhz19
wt32TestBoard.addService(mhz19);

const relay0 = new Relay();
shelly1.addService(relay0);

const button0 = new Button();
shelly1.addEvent(button0);

const relay1 = new Relay();
obiJack.addService(relay1);

const button1 = new Button();
obiJack.addEvent(button1);

const motion0 = new MotionSensor();
wt32TestBoard.addEvent(motion0);

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

  mcp9808
    .request()
    .then((result) => onResolve('✅ mcp9808', result))
    .catch(() => onReject('⛔️ mcp9808'));

  bme280
    .request()
    .then((result) => onResolve('✅ bme280', result))
    .catch(() => onReject('⛔️ bme280'));

  tsl2561
    .request()
    .then((result) => onResolve('✅ tsl2561', result))
    .catch(() => onReject('⛔️ tsl256'));

  veml6070
    .request()
    .then((result) => onResolve('✅ veml6070', result))
    .catch(() => onReject('⛔️ veml60'));
});

every30Seconds.addTask(() => {
  log.info(() => '⏲ every30Seconds');

  hello0
    .request()
    .then((result) => onResolve('✅ hello', result))
    .catch(() => onReject('⛔️ hello'));

  hello1
    .request()
    .then((result) => onResolve('✅ hello', result))
    .catch(() => onReject('⛔️ hello'));

  hello2
    .request()
    .then((result) => onResolve('✅ hello', result))
    .catch(() => onReject('⛔️ hello'));

  mhz19
    .request()
    .then((result) => onResolve('✅ mhz19', result))
    .catch(() => onReject('⛔️ mhz19'));
});

every2Minutes.addTask(() => {
  log.info(() => '⏲ every2Minutes');

  async
    .request()
    .then((result) => onResolve('✅ async', result))
    .catch(() => onReject('⛔️ async'));

  sds011
    .request()
    .then((result) => onResolve('✅ sds011', result))
    .catch(() => onReject('⛔️ sds011'));
});

isOnline.observe((online) => {
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

const changeRelays = (force?: boolean) => {
  if (!isOnline.value) return;

  on = force === undefined ? !on : force;

  relay0
    .request(on)
    .then(() => {
      onResolve('✅ relay0', null);
    })
    .catch(() => onReject('⛔️ relay0'));

  relay1
    .request(on)
    .then(() => {
      onResolve('✅ relay1', null);
    })
    .catch(() => onReject('⛔️ relay1'));
};

button0.observe((data) => {
  log.info(() => `event button0 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

button1.observe((data) => {
  log.info(() => `event button1 ${JSON.stringify(data)}`);

  if (
    (!data.down && data.downChanged && data.previousDuration < 125 * 5) ||
    data.longpress === 5
  ) {
    changeRelays();
  }
});

motion0.observe((data) => {
  log.info(() => `event motion0 ${data ? '👍' : '🚫'}`);
});
