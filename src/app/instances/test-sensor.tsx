import {
  Node,
  h,
  monitorObject,
  monitorPrimitive,
} from '../../lib/hierarchy/index.js';
import { every2Minutes, every30Seconds, every5Seconds } from '../timings.js';
import { Bme280 } from '../../lib/services/bme280/index.js';
import { Hello } from '../../lib/services/hello/index.js';
import { Input } from '../../lib/events/input/index.js';
import { Mcp9808 } from '../../lib/services/mcp9808/index.js';
import { Mhz19 } from '../../lib/services/mhz19/index.js';
import { Sds011 } from '../../lib/services/sds011/index.js';
import { Tsl2561 } from '../../lib/services/tsl2561/index.js';
import { UDPDevice } from '../../lib/device/udp.js';
import { Veml6070 } from '../../lib/services/veml6070/index.js';
import { logger } from '../logging.js';
import { observify } from '../../lib/observable/index.js';

export type Props = {
  host: string;
  port: number;
};

export function TestSensor({ host, port }: Props): Node {
  // LOGGER
  const log = logger.getInput({
    head: `${host}:${port}`,
  });

  // DEVICE
  const device = new UDPDevice(host, port);

  device.isOnline.observe((online) => {
    log.info(() => (online ? 'online' : 'offline'));
  });

  // EVENTS
  const motionEvent = new Input(0);
  device.addEvent(motionEvent);

  // SERVICES
  const bme280Service = new Bme280();
  const helloService = new Hello();
  const mcp9808Service = new Mcp9808();
  const mhz19Service = new Mhz19();
  const sds011Service = new Sds011();
  const tsl2561Service = new Tsl2561();
  const veml6070Service = new Veml6070();

  device.addService(bme280Service);
  device.addService(helloService);
  device.addService(mcp9808Service);
  device.addService(mhz19Service);
  device.addService(sds011Service);
  device.addService(tsl2561Service);
  device.addService(veml6070Service);

  const [bme280, bme280Trigger] = observify(() => bme280Service.request());
  const [hello, helloTrigger] = observify(() => helloService.request());
  const [mcp9808, mcp9808Trigger] = observify(() => mcp9808Service.request());
  const [mhz19, mhz19Trigger] = observify(() => mhz19Service.request());
  const [sds011, sds011Trigger] = observify(() => sds011Service.request());
  const [tsl2561, tsl2561Trigger] = observify(() => tsl2561Service.request());
  const [veml6070, veml6070Trigger] = observify(() =>
    veml6070Service.request()
  );

  every5Seconds.addTask(() => {
    if (!device.isOnline.value) return;

    log.info(() => 'every 5sec');

    bme280Trigger();
    mcp9808Trigger();
    tsl2561Trigger();
    veml6070Trigger();
  });

  every30Seconds.addTask(() => {
    if (!device.isOnline.value) return;

    log.info(() => 'every 30sec');

    helloTrigger();
    mhz19Trigger();
  });

  every2Minutes.addTask(() => {
    if (!device.isOnline.value) return;

    log.info(() => 'every 2min');

    sds011Trigger();
  });

  const result = (
    <section name="test-sensor">
      {monitorPrimitive('hello', hello)}
      <item name="humidity">{monitorObject('value', bme280, 'humidity')}</item>
      <item name="pressure">{monitorObject('value', bme280, 'pressure')}</item>
      <item name="temperature">{monitorPrimitive('value', mcp9808)}</item>
      <item name="co2">{monitorObject('value', mhz19, 'co2')}</item>
      <item name="pm10">{monitorObject('value', sds011, 'pm10')}</item>
      <item name="pm025">{monitorObject('value', sds011, 'pm025')}</item>
      <item name="brightness">{monitorPrimitive('value', tsl2561)}</item>
      <item name="uv">{monitorPrimitive('value', veml6070)}</item>
    </section>
  );

  every5Seconds.addTask(() => {
    log.info(() => result.toJSON());
  });

  return result;
}
