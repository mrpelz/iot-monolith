import { UDPDevice } from '../udp.js';

const device = new UDPDevice('10.97.0.198', 8266);

const event = device.getEvent(Buffer.from([0]));
const service1 = device.getService(Buffer.from([1]), 3000); // hello
const service2 = device.getService(Buffer.from([2]), 3000); // systemInfo
const service3 = device.getService(Buffer.from([3]), 33000); // async
const service4 = device.getService(Buffer.from([4]), 3000); // mcp9808
const service5 = device.getService(Buffer.from([5]), 3000); // bme280
const service6 = device.getService(Buffer.from([6]), 3000); // tsl2561
const service7 = device.getService(Buffer.from([7]), 3000); // sgp30
const service8 = device.getService(Buffer.from([8]), 3000); // ccs811
const service9 = device.getService(Buffer.from([9]), 3000); // veml6070
const service10 = device.getService(Buffer.from([10]), 33000); // sds011
const service11 = device.getService(Buffer.from([11]), 3000); // mhz19

const observation = device.isOnline.observe((online) => {
  if (!online) return;
  observation.remove();

  const onResolve = (description: string, result: Buffer) => {
    // eslint-disable-next-line no-console
    console.log(
      description,
      'response bytes',
      [...result].map((byte) => byte.toString(16)).join(',')
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

event.observable.observe((data) => {
  // eslint-disable-next-line no-console
  console.log('event', data.toString());
});
