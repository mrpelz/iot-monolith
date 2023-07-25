import { UDPDevice } from '../device/udp.js';
import { DevOutput, Logger } from '../log.js';
import { Bme280 } from '../services/bme280.js';
import { Ccs811 } from '../services/ccs811.js';
import { Mcp9808 } from '../services/mcp9808.js';
import { Sgp30 } from '../services/sgp30.js';
import { Tsl2561 } from '../services/tsl2561.js';

const logger = new Logger();
logger.addOutput(new DevOutput(6));

const device = new UDPDevice(
  logger,
  'test-room-sensor.lan.wurstsalat.cloud',
  1337,
);
device.transport.connect();

const mcp9808 = device.addService(new Mcp9808());

device.isOnline.observe(async (online, observer) => {
  if (!online) return;
  observer.remove();

  const response = await mcp9808.request();
  if (response === null) return;

  const log = logger.getInput({
    head: 'mcp9808',
  });

  log.info(() => response.toString());
});

const bme280 = device.addService(new Bme280());

device.isOnline.observe(async (online, observer) => {
  if (!online) return;
  observer.remove();

  const response = await bme280.request();
  if (response === null) return;

  const log = logger.getInput({
    head: 'bme280',
  });

  log.info(() => `humidity: ${response.humidity.toString()}`);
  log.info(() => `pressure: ${response.pressure.toString()}`);
  log.info(() => `temperature: ${response.temperature.toString()}`);
});

const tsl2561 = device.addService(new Tsl2561());

device.isOnline.observe(async (online, observer) => {
  if (!online) return;
  observer.remove();

  const response = await tsl2561.request();
  if (response === null) return;

  const log = logger.getInput({
    head: 'tsl2561',
  });

  log.info(() => response.toString());
});

const sgp30 = device.addService(new Sgp30());

device.isOnline.observe(async (online, observer) => {
  if (!online) return;
  observer.remove();

  const response = await sgp30.request({ humidity: 30, temperature: 25 });
  if (response === null) return;

  const log = logger.getInput({
    head: 'sgp30',
  });

  log.info(() => `eco2: ${response.eco2.toString()}`);
  log.info(() => `ethanol: ${response.ethanol.toString()}`);
  log.info(() => `h2: ${response.h2.toString()}`);
  log.info(() => `tvoc: ${response.tvoc.toString()}`);
});

const ccs811 = device.addService(new Ccs811());

device.isOnline.observe(async (online, observer) => {
  if (!online) return;
  observer.remove();

  const response = await ccs811.request({ humidity: 30, temperature: 25 });
  if (response === null) return;

  const log = logger.getInput({
    head: 'ccs811',
  });

  log.info(() => `temperature: ${response.temperature.toString()}`);
  log.info(() => `tvoc: ${response.tvoc.toString()}`);
  log.info(() => `eco2: ${response.eco2.toString()}`);
});
