import {
  BooleanGroupStrategy,
  BooleanStateGroup,
} from '../../state-group/index.js';
import { Event, Service } from '../index.js';
import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { Schedule } from '../../schedule/index.js';
import { Timer } from '../../timer/index.js';
import { UDPDevice } from '../udp.js';
import { logger } from '../../../app/logging.js';

const log = logger.getInput({
  head: 'device-test',
});

const testDevice = new UDPDevice('10.97.0.198', 1337);
const shelly1 = new UDPDevice('10.97.0.199', 1337);
const obiJack = new UDPDevice('10.97.0.159', 1337);
const h801 = new UDPDevice('10.97.0.154', 1337);
const shellyi3 = new UDPDevice('10.97.0.187', 1337);
const olimex = new UDPDevice('10.97.0.169', 1337);
const espNowTestNode = new UDPDevice('10.97.0.163', 1337);

const isOnline = new BooleanStateGroup(
  BooleanGroupStrategy.IS_TRUE_IF_ALL_TRUE,
  testDevice.isOnline,
  shelly1.isOnline,
  obiJack.isOnline,
  h801.isOnline,
  shellyi3.isOnline,
  olimex.isOnline,
  espNowTestNode.isOnline
);

let on = false;

const timer = new Timer(10000);

class Hello extends Service<string, void> {
  constructor() {
    super(Buffer.from([1]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): string {
    return input.toString('ascii');
  }
}

class Mcp9808 extends Service<number, void> {
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
class Bme280 extends Service<Bme280Response, void> {
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

class Tsl2561 extends Service<number, void> {
  constructor() {
    super(Buffer.from([6]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): number | null {
    if (input.length < 4) return null;

    return input.readFloatLE();
  }
}

class Veml6070 extends Service<number, void> {
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
class Sds011280 extends Service<Sds011Response, void> {
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
class Mhz19 extends Service<Mhz19Response, void> {
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

class Relay extends Service<null, boolean> {
  constructor(index: number) {
    super(Buffer.from([0xa0 + index]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected encode(input: boolean): Buffer {
    return Buffer.from([input ? 1 : 0]);
  }
}

class Led extends Service<null, number> {
  constructor(index: number) {
    super(Buffer.from([0xb0 + index]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected encode(input: number): Buffer {
    return Buffer.from([input]);
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
  constructor(index: number) {
    super(Buffer.from([index]));
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
  constructor(index: number) {
    super(Buffer.from([0xa0 + index]));
  }

  // eslint-disable-next-line class-methods-use-this
  protected decode(input: Buffer): boolean | null {
    if (!input.length) return null;

    return input[0] !== 0;
  }
}

const helloTestDevice = new Hello(); // hello
testDevice.addService(helloTestDevice);

const async = new Service<Buffer, void>(Buffer.from([3]), 32000); // async
testDevice.addService(async);

const mcp9808 = new Mcp9808(); // mcp9808
testDevice.addService(mcp9808);

const bme280 = new Bme280(); // bme280
testDevice.addService(bme280);

const tsl2561 = new Tsl2561(); // tsl2561
testDevice.addService(tsl2561);

const sgp30 = new Service(Buffer.from([7])); // sgp30
testDevice.addService(sgp30);

const ccs811 = new Service(Buffer.from([8])); // ccs811
testDevice.addService(ccs811);

const veml6070 = new Veml6070(); // veml6070
testDevice.addService(veml6070);

const sds011 = new Sds011280(); // sds011
testDevice.addService(sds011);

const mhz19 = new Mhz19(); // mhz19
testDevice.addService(mhz19);

const motionTestDevice = new MotionSensor(0);
testDevice.addEvent(motionTestDevice);

const helloShelly1 = new Hello(); // hello
shelly1.addService(helloShelly1);

const relayShelly1 = new Relay(0);
shelly1.addService(relayShelly1);

const buttonShelly1 = new Button(0);
shelly1.addEvent(buttonShelly1);

const helloObiJack = new Hello(); // hello
obiJack.addService(helloObiJack);

const relayObiJack = new Relay(0);
obiJack.addService(relayObiJack);

const buttonObiJack = new Button(0);
obiJack.addEvent(buttonObiJack);

const helloH801 = new Hello(); // hello
h801.addService(helloH801);

const led0 = new Led(0);
h801.addService(led0);

const led1 = new Led(1);
h801.addService(led1);

const led2 = new Led(2);
h801.addService(led2);

const led3 = new Led(3);
h801.addService(led3);

const led4 = new Led(4);
h801.addService(led4);

const helloShellyi3 = new Hello(); // hello
shellyi3.addService(helloShellyi3);

const button0Shellyi3 = new Button(0);
shellyi3.addEvent(button0Shellyi3);

const button1Shellyi3 = new Button(1);
shellyi3.addEvent(button1Shellyi3);

const button2Shellyi3 = new Button(2);
shellyi3.addEvent(button2Shellyi3);

const helloOlimex = new Hello(); // hello
olimex.addService(helloOlimex);

const espNow = new Event<Buffer>(Buffer.from([0xfe]));
olimex.addEvent(espNow);

const helloEspNowTestNode = new Hello(); // hello
espNowTestNode.addService(helloEspNowTestNode);

const espNowTestNodeButton = new Button(0);
espNowTestNode.addEvent(espNowTestNodeButton);

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

  if (testDevice.isOnline.value) {
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
  }
});

every30Seconds.addTask(() => {
  log.info(() => '⏲ every30Seconds');

  if (testDevice.isOnline.value) {
    helloTestDevice
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));

    mhz19
      .request()
      .then((result) => onResolve('✅ mhz19', result))
      .catch(() => onReject('⛔️ mhz19'));
  }

  if (shelly1.isOnline.value) {
    helloShelly1
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (obiJack.isOnline.value) {
    helloObiJack
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (h801.isOnline.value) {
    helloH801
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (shellyi3.isOnline.value) {
    helloShellyi3
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (olimex.isOnline.value) {
    helloOlimex
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (espNowTestNode.isOnline.value) {
    helloEspNowTestNode
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }
});

every2Minutes.addTask(() => {
  log.info(() => '⏲ every2Minutes');

  if (testDevice.isOnline.value) {
    async
      .request()
      .then((result) => onResolve('✅ async', result))
      .catch(() => onReject('⛔️ async'));

    sds011
      .request()
      .then((result) => onResolve('✅ sds011', result))
      .catch(() => onReject('⛔️ sds011'));
  }
});

isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ offline');
    return;
  }

  log.info(() => '📶 online');
});

testDevice.isOnline.observe((online) => {
  if (!online) {
    every5Seconds.stop();
    every30Seconds.stop();
    every2Minutes.stop();

    return;
  }

  every5Seconds.start();
  every30Seconds.start();
  every2Minutes.start();
});

const changeLeds = (dutyCycle: number) => {
  if (!h801.isOnline.value) return;

  led0
    .request(dutyCycle)
    .then((result) => {
      onResolve('✅ led0', result);
    })
    .catch(() => onReject('⛔️ led0'));

  led1
    .request(dutyCycle)
    .then((result) => {
      onResolve('✅ led1', result);
    })
    .catch(() => onReject('⛔️ led1'));

  led2
    .request(dutyCycle)
    .then((result) => {
      onResolve('✅ led2', result);
    })
    .catch(() => onReject('⛔️ led2'));

  led3
    .request(dutyCycle)
    .then((result) => {
      onResolve('✅ led3', result);
    })
    .catch(() => onReject('⛔️ led3'));

  led4
    .request(dutyCycle)
    .then((result) => {
      onResolve('✅ led4', result);
    })
    .catch(() => onReject('⛔️ led4'));
};

const changeRelays = (force?: boolean) => {
  on = force === undefined ? !on : force;

  log.info(() => `button press ➡️ ${on ? '🟢' : '🔴'}`);

  if (shelly1.isOnline.value) {
    relayShelly1
      .request(on)
      .then((result) => {
        onResolve('✅ relayShelly1', result);
      })
      .catch(() => onReject('⛔️ relayShelly1'));
  }

  if (obiJack.isOnline.value) {
    relayObiJack
      .request(on)
      .then((result) => {
        onResolve('✅ relayObiJack', result);
      })
      .catch(() => onReject('⛔️ relayObiJack'));
  }

  if (on) {
    changeLeds(255);
    return;
  }

  changeLeds(timer.isRunning ? 64 : 0);
};

buttonShelly1.observe((data) => {
  log.info(() => `event buttonShelly1 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

buttonObiJack.observe((data) => {
  log.info(() => `event buttonObiJack ${JSON.stringify(data)}`);

  if (
    (!data.down && data.downChanged && data.previousDuration < 125 * 5) ||
    data.longpress === 5
  ) {
    changeRelays();
  }
});

button0Shellyi3.observe((data) => {
  log.info(() => `event button0Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

button1Shellyi3.observe((data) => {
  log.info(() => `event button1Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

button2Shellyi3.observe((data) => {
  log.info(() => `event button2Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

motionTestDevice.observe((data) => {
  log.info(() => `event motionTestDevice ${data ? '🟡' : '🔵'}`);

  if (on || !data) return;

  changeLeds(64);
  timer.start();
});

espNow.observe((data) => {
  const input = data.subarray(7);
  const macAddress = data.subarray(0, 6);

  const decoded = {
    down: input.subarray(0, 1).readUInt8() !== 0, // 1.
    downChanged: input.subarray(1, 2).readUInt8() !== 0, // 2.
    longpress: input.subarray(3, 4).readUInt8(), // 4.
    previousDuration: input.subarray(4, 10).readUInt32LE(), // 5.
    repeat: input.subarray(2, 3).readUInt8(), // 3.
  };

  log.info(
    () =>
      `event espNow ${[...macAddress].map((byte) =>
        byte.toString(16)
      )}: ${JSON.stringify(decoded)}`
  );

  if (
    (!decoded.down &&
      decoded.downChanged &&
      decoded.previousDuration < 125 * 5) ||
    decoded.longpress === 5
  ) {
    changeRelays();
  }
});

espNowTestNodeButton.observe((data) => {
  log.info(() => `event espNowTestNodeButton ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

timer.observe(() => {
  if (on) return;
  changeLeds(0);
});
