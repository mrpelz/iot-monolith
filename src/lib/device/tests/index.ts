import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import { Async } from '../../services/async/index.js';
import { Bme280 } from '../../services/bme280/index.js';
import { Button } from '../../events/button/index.js';
import { ESPNowDevice } from '../esp-now.js';
import { ESPNow as ESPNowEvent } from '../../events/esp-now/index.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Hello } from '../../services/hello/index.js';
import { Input } from '../../events/input/index.js';
import { Led } from '../../services/led/index.js';
import { Mcp9808 } from '../../services/mcp9808/index.js';
import { Mhz19 } from '../../services/mhz19/index.js';
import { Output } from '../../services/output/index.js';
import { Schedule } from '../../schedule/index.js';
import { Sds011 } from '../../services/sds011/index.js';
import { Service } from '../index.js';
import { Timer } from '../../timer/index.js';
import { Tsl2561 } from '../../services/tsl2561/index.js';
import { UDPDevice } from '../udp.js';
import { VCC } from '../../events/vcc/index.js';
import { Veml6070 } from '../../services/veml6070/index.js';
import { logger } from '../../../app/logging.js';

const log = logger.getInput({
  head: 'device-test',
});

const testDevice = new UDPDevice(
  'test-device.iot-ng.net.wurstsalat.cloud',
  1337
);
const shelly1 = new UDPDevice('shelly1.iot-ng.net.wurstsalat.cloud', 1337);
const obiJack = new UDPDevice('obi-jack.iot-ng.net.wurstsalat.cloud', 1337);
const h801 = new UDPDevice('h801.iot-ng.net.wurstsalat.cloud', 1337);
const shellyi3 = new UDPDevice('shelly-i3.iot-ng.net.wurstsalat.cloud', 1337);

const olimexEspNowGw = new UDPDevice(
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud',
  1337
);
const espNowEvent = new ESPNowEvent();
olimexEspNowGw.addEvent(espNowEvent);
const espNowTransport = new ESPNowTransport(espNowEvent);

const wifiTestButton = new UDPDevice(
  'esp-now-test-button.iot-ng.net.wurstsalat.cloud',
  1337
);
const espNowTestButton = new ESPNowDevice(
  espNowTransport,
  // prettier-ignore
  [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf]
);

const wifiTestWindowSensor = new UDPDevice(
  'esp-now-test-window-sensor.iot-ng.net.wurstsalat.cloud',
  1337
);
const espNowTestWindowSensor = new ESPNowDevice(
  espNowTransport,
  // prettier-ignore
  [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0]
);

let on = false;

const timer = new Timer(10000);

const helloTestDevice = new Hello(); // hello
testDevice.addService(helloTestDevice);

const async = new Async();
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

const sds011 = new Sds011(); // sds011
testDevice.addService(sds011);

const mhz19 = new Mhz19(); // mhz19
testDevice.addService(mhz19);

const motionTestDevice = new Input(0);
testDevice.addEvent(motionTestDevice);

const helloShelly1 = new Hello(); // hello
shelly1.addService(helloShelly1);

const relayShelly1 = new Output(0);
shelly1.addService(relayShelly1);

const buttonShelly1 = new Button(0);
shelly1.addEvent(buttonShelly1);

const helloObiJack = new Hello(); // hello
obiJack.addService(helloObiJack);

const relayObiJack = new Output(0);
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

const helloWifiTestButton = new Hello(); // hello
wifiTestButton.addService(helloWifiTestButton);

const button0wifiTestButton = new Button(0);
wifiTestButton.addEvent(button0wifiTestButton);

const button0espNowTestButton = new Button(0);
espNowTestButton.addEvent(button0espNowTestButton);

const button1wifiTestButton = new Button(1);
wifiTestButton.addEvent(button1wifiTestButton);

const button1espNowTestButton = new Button(1);
espNowTestButton.addEvent(button1espNowTestButton);

const vccEspNowTestButton = new VCC();
espNowTestButton.addEvent(vccEspNowTestButton);

const helloOlimex = new Hello(); // hello
olimexEspNowGw.addService(helloOlimex);

const helloWiFiTestWindowSensor = new Hello(); // hello
wifiTestWindowSensor.addService(helloWiFiTestWindowSensor);

const wifiWindowOpenSensor = new Input(0);
wifiTestWindowSensor.addEvent(wifiWindowOpenSensor);

const espNowWindowOpenSensor = new Input(0);
espNowTestWindowSensor.addEvent(espNowWindowOpenSensor);

const wifiWindowOpenFullySensor = new Input(1);
wifiTestWindowSensor.addEvent(wifiWindowOpenFullySensor);

const espNowWindowOpenFullySensor = new Input(1);
espNowTestWindowSensor.addEvent(espNowWindowOpenFullySensor);

const wifiWindowAdditionalInput = new Input(2);
wifiTestWindowSensor.addEvent(wifiWindowAdditionalInput);

const espNowWindowAdditionalInput = new Input(2);
espNowTestWindowSensor.addEvent(espNowWindowAdditionalInput);

const espNowWindowVcc = new VCC();
espNowTestWindowSensor.addEvent(espNowWindowVcc);

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

  if (wifiTestButton.isOnline.value) {
    helloWifiTestButton
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (olimexEspNowGw.isOnline.value) {
    helloOlimex
      .request()
      .then((result) => onResolve('✅ hello', result))
      .catch(() => onReject('⛔️ hello'));
  }

  if (wifiTestWindowSensor.isOnline.value) {
    helloWiFiTestWindowSensor
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

testDevice.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ testDevice offline');
    return;
  }

  log.info(() => '📶 testDevice online');
});
shelly1.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ shelly1 offline');
    return;
  }

  log.info(() => '📶 shelly1 online');
});
obiJack.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ obiJack offline');
    return;
  }

  log.info(() => '📶 obiJack online');
});
h801.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ h801 offline');
    return;
  }

  log.info(() => '📶 h801 online');
});
shellyi3.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ shellyi3 offline');
    return;
  }

  log.info(() => '📶 shellyi3 online');
});
wifiTestButton.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ espNowTestButton offline');
    return;
  }

  log.info(() => '📶 espNowTestButton online');
});
olimexEspNowGw.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ olimexEspNowGw offline');
    return;
  }

  log.info(() => '📶 olimexEspNowGw online');
});
wifiTestWindowSensor.isOnline.observe((online) => {
  if (!online) {
    log.info(() => '❌ espNowTestWindowSensor offline');
    return;
  }

  log.info(() => '📶 espNowTestWindowSensor online');
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

buttonShelly1.observable.observe((data) => {
  log.info(() => `event buttonShelly1 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

buttonObiJack.observable.observe((data) => {
  log.info(() => `event buttonObiJack ${JSON.stringify(data)}`);

  if (
    (!data.down && data.downChanged && data.previousDuration < 125 * 5) ||
    data.longpress === 5
  ) {
    changeRelays();
  }
});

button0Shellyi3.observable.observe((data) => {
  log.info(() => `event button0Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

button1Shellyi3.observable.observe((data) => {
  log.info(() => `event button1Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

button2Shellyi3.observable.observe((data) => {
  log.info(() => `event button2Shellyi3 ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});

motionTestDevice.observable.observe((data) => {
  log.info(() => `event motionTestDevice ${data ? '🟡' : '🔵'}`);

  if (on || !data) return;

  changeLeds(64);
  timer.start();
});

button0wifiTestButton.observable.observe((data) => {
  log.info(() => `event button0wifiTestButton ${JSON.stringify(data)}`);

  if (
    (!data.down && data.downChanged && data.previousDuration < 125 * 5) ||
    data.longpress === 5
  ) {
    changeRelays();
  }
});
button0espNowTestButton.observable.observe((data) => {
  log.info(() => `event button0espNowTestButton ${JSON.stringify(data)}`);

  if (
    (!data.down && data.downChanged && data.previousDuration < 125 * 5) ||
    data.longpress === 5
  ) {
    changeRelays();
  }
});

button1wifiTestButton.observable.observe((data) => {
  log.info(() => `event button1wifiTestButton ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});
button1espNowTestButton.observable.observe((data) => {
  log.info(() => `event button1espNowTestButton ${JSON.stringify(data)}`);

  if (!data.down && data.downChanged) {
    changeRelays();
  }
});
vccEspNowTestButton.observable.observe((data) => {
  log.info(() => `event vccEspNowTestButton "${data}"`);
});

wifiWindowOpenSensor.observable.observe((data) => {
  log.info(() => `event wifiWindowOpenSensor ${data ? '🟡' : '🔵'}`);
});
espNowWindowOpenSensor.observable.observe((data) => {
  log.info(() => `event espNowWindowOpenSensor ${data ? '🟡' : '🔵'}`);
});

wifiWindowOpenFullySensor.observable.observe((data) => {
  log.info(() => `event wifiWindowOpenFullySensor ${data ? '🟡' : '🔵'}`);
});
espNowWindowOpenFullySensor.observable.observe((data) => {
  log.info(() => `event espNowWindowOpenFullySensor ${data ? '🟡' : '🔵'}`);
});

wifiWindowAdditionalInput.observable.observe((data) => {
  log.info(() => `event wifiWindowAdditionalInput ${data ? '🟡' : '🔵'}`);
});
espNowWindowAdditionalInput.observable.observe((data) => {
  log.info(() => `event espNowWindowAdditionalInput ${data ? '🟡' : '🔵'}`);
});
espNowWindowVcc.observable.observe((data) => {
  log.info(() => `event espNowWindowVcc "${data}"`);
});

timer.observe(() => {
  if (on) return;
  changeLeds(0);
});
