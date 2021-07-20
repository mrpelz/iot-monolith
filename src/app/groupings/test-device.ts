import { Bme280, Bme280Response } from '../../lib/services/bme280.js';
import { Mhz19, Mhz19Response } from '../../lib/services/mhz19.js';
import { MultiValueSensor, SingleValueSensor } from '../../lib/items/sensor.js';
import { Sds011, Sds011Response } from '../../lib/services/sds011.js';
import { every2Minutes, every30Seconds, every5Seconds } from '../timings.js';
import { Async } from '../../lib/services/async.js';
import { Hello } from '../../lib/services/hello.js';
import { Input } from '../../lib/events/input.js';
import { Mcp9808 } from '../../lib/services/mcp9808.js';
import { SingleValueEvent } from '../../lib/items/event.js';
import { Tsl2561 } from '../../lib/services/tsl2561.js';
import { UDPDevice } from '../../lib/device/udp.js';
import { Veml6070 } from '../../lib/services/veml6070.js';

export class TestDevice {
  readonly async: SingleValueSensor<Buffer>;
  readonly bme280: MultiValueSensor<
    Bme280Response,
    'humidity' | 'pressure' | 'temperature'
  >;

  readonly device: UDPDevice;
  readonly hello: SingleValueSensor<string>;
  readonly mcp9808: SingleValueSensor<number>;
  readonly mhz19: MultiValueSensor<
    Mhz19Response,
    'temperature' | 'abc' | 'accuracy' | 'co2' | 'transmittance'
  >;

  readonly motion: SingleValueEvent<boolean>;
  readonly sds011: MultiValueSensor<Sds011Response, 'pm025' | 'pm10'>;
  readonly tsl2561: SingleValueSensor<number>;
  readonly veml6070: SingleValueSensor<number>;

  constructor(host = 'test-device.iot-ng.net.wurstsalat.cloud', port = 1337) {
    this.device = new UDPDevice(host, port);

    this.hello = new SingleValueSensor(
      this.device.addService(new Hello()),
      every30Seconds
    );
    this.async = new SingleValueSensor(
      this.device.addService(new Async()),
      every2Minutes
    );
    this.mcp9808 = new SingleValueSensor(
      this.device.addService(new Mcp9808()),
      every5Seconds
    );
    this.bme280 = new MultiValueSensor(
      this.device.addService(new Bme280()),
      ['humidity', 'pressure', 'temperature'],
      every5Seconds
    );
    this.tsl2561 = new SingleValueSensor(
      this.device.addService(new Tsl2561()),
      every5Seconds
    );
    this.veml6070 = new SingleValueSensor(
      this.device.addService(new Veml6070()),
      every5Seconds
    );
    this.sds011 = new MultiValueSensor(
      this.device.addService(new Sds011()),
      ['pm025', 'pm10'],
      every2Minutes
    );
    this.mhz19 = new MultiValueSensor(
      this.device.addService(new Mhz19()),
      ['abc', 'accuracy', 'co2', 'temperature', 'transmittance'],
      every2Minutes
    );

    this.motion = new SingleValueEvent(this.device.addEvent(new Input(0)));
  }
}
