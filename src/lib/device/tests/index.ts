import { Event, Service } from '../index.js';
import { UDPDevice } from '../udp.js';

type Bme280Response = {
  humidity: number;
  pressure: number;
  temperature: number;
};

class Bme280 extends Service<Bme280Response> {
  constructor() {
    super(Buffer.from([5]), 3000);
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

const device = new UDPDevice('10.97.0.198', 8266);

const event = new Event<Buffer>(Buffer.from([0]));
device.addEvent(event);

const service1 = new Service(Buffer.from([1]), 3000); // hello
device.addService(service1);

const service2 = new Service(Buffer.from([2]), 3000); // systemInfo
device.addService(service2);

const service3 = new Service(Buffer.from([3]), 33000); // async
device.addService(service3);

const service4 = new Service(Buffer.from([4]), 3000); // mcp9808
device.addService(service4);

const service5 = new Bme280(); // bme280
device.addService(service5);

const service6 = new Service(Buffer.from([6]), 3000); // tsl2561
device.addService(service6);

const service7 = new Service(Buffer.from([7]), 3000); // sgp30
device.addService(service7);

const service8 = new Service(Buffer.from([8]), 3000); // ccs811
device.addService(service8);

const service9 = new Service(Buffer.from([9]), 3000); // veml6070
device.addService(service9);

const service10 = new Service(Buffer.from([10]), 33000); // sds011
device.addService(service10);

const service11 = new Service(Buffer.from([11]), 3000); // mhz19
device.addService(service11);

const observation = device.isOnline.observe((online) => {
  if (!online) return;
  observation.remove();

  const onResolve = (description: string, result: unknown) => {
    // eslint-disable-next-line no-console
    console.log(
      description,
      'response bytes',
      result instanceof Buffer
        ? [...result].map((byte) => byte.toString(16)).join(',')
        : result
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onReject = (description: string) => {
    // eslint-disable-next-line no-console
    console.log('request failed', description);
  };

  service1
    .request()
    .then((result) => onResolve('hello', result))
    .catch(() => onReject('hello'));

  service2
    .request()
    .then((result) => onResolve('systemInfo', result))
    .catch(() => onReject('system'));

  service3
    .request()
    .then((result) => onResolve('async', result))
    .catch(() => onReject('async'));

  service4
    .request()
    .then((result) => onResolve('mcp9808', result))
    .catch(() => onReject('mcp9808'));

  service5
    .request()
    .then((result) => onResolve('bme280', result))
    .catch(() => onReject('bme280'));

  service6
    .request()
    .then((result) => onResolve('tsl2561', result))
    .catch(() => onReject('tsl256'));

  // service7
  //   .request()
  //   .then((result) => onResolve('sgp30', result))
  //   .catch(() => onReject('sgp30'));

  // service8
  //   .request()
  //   .then((result) => onResolve('ccs811', result))
  //   .catch(() => onReject('ccs811'));

  service9
    .request()
    .then((result) => onResolve('veml6070', result))
    .catch(() => onReject('veml60'));

  service10
    .request()
    .then((result) => onResolve('sds011', result))
    .catch(() => onReject('sds011'));

  service11
    .request()
    .then((result) => onResolve('mhz19', result))
    .catch(() => onReject('mhz19'));
});

event.observe((data) => {
  // eslint-disable-next-line no-console
  console.log('event', data ? data.toString() : data);
});
