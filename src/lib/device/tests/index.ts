import {
  BooleanGroupStrategy,
  BooleanStateGroup,
} from '../../state-group/index.js';
import { Device, Event, Service } from '../index.js';
import { ModifiableDate, Unit } from '../../modifiable-date/index.js';
import {
  MultiValueEvent,
  SingleValueEvent,
  StatelessMultiValueEvent,
  StatelessSingleValueEvent,
} from '../../items/event/index.js';
import {
  MultiValueSensor,
  SingleValueSensor,
} from '../../items/sensor/index.js';
import { Async } from '../../services/async/index.js';
import { Bme280 } from '../../services/bme280/index.js';
import { BooleanState } from '../../state/index.js';
import { Button } from '../../items/button/index.js';
import { Button as ButtonEvent } from '../../events/button/index.js';
import { ESPNowDevice } from '../esp-now.js';
import { ESPNow as ESPNowEvent } from '../../events/esp-now/index.js';
import { ESPNowTransport } from '../../transport/esp-now.js';
import { Ev1527Button } from '../../events/ev1527-button/index.js';
import {
  Ev1527Device,
  // bitLengthPayload,
  // maxPayload
} from '../ev1527.js';
import { Ev1527Transport } from '../../transport/ev1527.js';
import { Ev1527WindowSensor } from '../../events/ev1527-window-sensor/index.js';
import { Hello } from '../../services/hello/index.js';
import { Indicator } from '../../services/indicator/index.js';
import { Input } from '../../events/input/index.js';
import { Led } from '../../items/led/index.js';
import { Led as LedService } from '../../services/led/index.js';
import { Mcp9808 } from '../../services/mcp9808/index.js';
import { Mhz19 } from '../../services/mhz19/index.js';
import { Output } from '../../items/output/index.js';
import { Output as OutputService } from '../../services/output/index.js';
import { ReadOnlyObservable } from '../../observable/index.js';
import { Rf433 } from '../../events/rf433/index.js';
import { Schedule } from '../../schedule/index.js';
import { Sds011 } from '../../services/sds011/index.js';
import { Timer } from '../../timer/index.js';
import { Tsl2561 } from '../../services/tsl2561/index.js';
import { UDPDevice } from '../udp.js';
import { VCC } from '../../events/vcc/index.js';
import { Veml6070 } from '../../services/veml6070/index.js';
import { logger } from '../../../app/logging.js';

const log = logger.getInput({
  head: 'device-test',
});

const on = new BooleanState(false);

const timedOn = new BooleanState(false);
const timer = new Timer(10000);

timedOn.observe((value) => {
  if (!value) return;
  timer.start();
});
timer.observe(() => (timedOn.value = false));

const ledOn = new BooleanStateGroup(
  BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
  new ReadOnlyObservable(on),
  new ReadOnlyObservable(timedOn)
);

const every5Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 5).date,
  false
);
every5Seconds.start();

const every30Seconds = new Schedule(
  () => new ModifiableDate().ceil(Unit.SECOND, 30).date,
  false
);
every30Seconds.start();

const every2Minutes = new Schedule(
  () => new ModifiableDate().ceil(Unit.MINUTE, 2).date,
  false
);
every2Minutes.start();

const doLog = (label: string, path: string[], value: unknown) => {
  log.info(() => `${label} => ${path.join('/')}: ${JSON.stringify(value)}`);
};

const doDevice = (deviceLabel: string, device: Device) => {
  device.isOnline.observe((value) =>
    doLog('device', [deviceLabel], value ? 'online' : 'offline')
  );

  return [deviceLabel, device] as const;
};

const doService = <T extends Service<unknown, unknown>>(
  service: T,
  device: Device
) => {
  device.addService(service);

  return service;
};

const doEvent = <T extends Event<unknown>>(event: T, device: Device) => {
  device.addEvent(event);

  return event;
};

const doEventWithLog = <T extends Event<unknown>>(
  deviceLabel: string,
  eventLabel: string,
  event: T,
  device: Device
) => {
  device.addEvent(event);

  event.observable.observe((value) =>
    doLog('event', [deviceLabel, eventLabel], value)
  );

  return event;
};

const doItem = <
  T extends
    | SingleValueSensor
    | SingleValueEvent
    | StatelessSingleValueEvent
    | MultiValueSensor<Record<string, unknown>, string>
    | MultiValueEvent<Record<string, unknown>, string>
    | StatelessMultiValueEvent<Record<string, unknown>, string>
>(
  deviceLabel: string,
  itemLabel: string,
  item: T
): T => {
  if (item instanceof SingleValueSensor) {
    item.state.observe((value) =>
      doLog('singleValueSensor', [deviceLabel, itemLabel], value)
    );

    return item;
  }

  if (item instanceof SingleValueEvent) {
    item.state.observe((value) =>
      doLog('singleValueEvent', [deviceLabel, itemLabel], value)
    );

    return item;
  }

  if (item instanceof StatelessSingleValueEvent) {
    item.state.observe((value) =>
      doLog('statelessSingleValueEvent', [deviceLabel, itemLabel], value)
    );

    return item;
  }

  if (item instanceof MultiValueSensor) {
    for (const [property, value] of Object.entries(item.state)) {
      value.observe((_value) =>
        doLog('multiValueSensor', [deviceLabel, itemLabel, property], _value)
      );
    }

    return item;
  }

  if (item instanceof MultiValueEvent) {
    for (const [property, value] of Object.entries(item.state)) {
      value.observe((_value) =>
        doLog('multiValueEvent', [deviceLabel, itemLabel, property], _value)
      );
    }

    return item;
  }

  for (const [property, value] of Object.entries(item.state)) {
    value.observe((_value) =>
      doLog(
        'statelessMultiValueEvent',
        [deviceLabel, itemLabel, property],
        _value
      )
    );
  }

  return item;
};

(() => {
  const [deviceLabel, device] = doDevice(
    'testDevice',
    new UDPDevice('test-device.iot-ng.net.wurstsalat.cloud', 1337)
  );

  doItem(
    deviceLabel,
    'hello',
    new SingleValueSensor(doService(new Hello(), device), every30Seconds)
  );

  doItem(
    deviceLabel,
    'async',
    new SingleValueSensor(doService(new Async(), device), every2Minutes)
  );

  doItem(
    deviceLabel,
    'mcp9808',
    new SingleValueSensor(doService(new Mcp9808(), device), every5Seconds)
  );

  doItem(
    deviceLabel,
    'bme280',
    new MultiValueSensor(
      doService(new Bme280(), device),
      ['humidity', 'pressure', 'temperature'],
      every5Seconds
    )
  );

  doItem(
    deviceLabel,
    'tsl2561',
    new SingleValueSensor(doService(new Tsl2561(), device), every5Seconds)
  );

  doItem(
    deviceLabel,
    'veml6070',
    new SingleValueSensor(doService(new Veml6070(), device), every5Seconds)
  );

  doItem(
    deviceLabel,
    'sds011',
    new MultiValueSensor(
      doService(new Sds011(), device),
      ['pm025', 'pm10'],
      every2Minutes
    )
  );

  doItem(
    deviceLabel,
    'mhz19',
    new MultiValueSensor(
      doService(new Mhz19(), device),
      ['abc', 'accuracy', 'co2', 'temperature', 'transmittance'],
      every2Minutes
    )
  );

  const motion = doItem(
    deviceLabel,
    'motion',
    new SingleValueEvent(doEvent(new Input(0), device))
  );
  motion.state.observe((value) => {
    if (!value) return;
    timedOn.value = true;
  });
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'obiJack',
    new UDPDevice('obi-jack.iot-ng.net.wurstsalat.cloud', 1337)
  );

  doItem(
    deviceLabel,
    'hello',
    new SingleValueSensor(doService(new Hello(), device), every30Seconds)
  );

  const output = new Output(
    doService(new OutputService(0), device),
    doService(new Indicator(0), device)
  );

  output.actualState.observe((value) =>
    doLog('log', [deviceLabel, 'output', 'actualState'], value)
  );

  on.observe((value) => (output.setState.value = value));

  const button = new Button(
    doEventWithLog(deviceLabel, 'button', new ButtonEvent(0), device)
  );
  button.shortPress(() => {
    on.flip();
  });
  button.longPress(() => {
    on.flip();
  });
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'h801',
    new UDPDevice('h801.iot-ng.net.wurstsalat.cloud', 1337)
  );

  doItem(
    deviceLabel,
    'hello',
    new SingleValueSensor(doService(new Hello(), device), every30Seconds)
  );

  const led0 = new Led(
    doService(new LedService(0), device),
    doService(new Indicator(0), device)
  );
  led0.actualBrightness.observe((value) => {
    doLog('log', [deviceLabel, 'led0', 'actualBrightness'], value);
  });
  ledOn.observe((value) => (led0.setBrightness.value = value ? 255 : 0));

  const led1 = new Led(doService(new LedService(1), device));
  led1.actualBrightness.observe((value) => {
    doLog('log', [deviceLabel, 'led1', 'actualBrightness'], value);
  });
  ledOn.observe((value) => (led1.setBrightness.value = value ? 255 : 0));

  const led2 = new Led(doService(new LedService(2), device));
  led2.actualBrightness.observe((value) => {
    doLog('log', [deviceLabel, 'led2', 'actualBrightness'], value);
  });
  ledOn.observe((value) => (led2.setBrightness.value = value ? 255 : 0));

  const led3 = new Led(doService(new LedService(3), device));
  led3.actualBrightness.observe((value) => {
    doLog('log', [deviceLabel, 'led3', 'actualBrightness'], value);
  });
  ledOn.observe((value) => (led3.setBrightness.value = value ? 255 : 0));

  const led4 = new Led(doService(new LedService(4), device));
  led4.actualBrightness.observe((value) => {
    doLog('log', [deviceLabel, 'led4', 'actualBrightness'], value);
  });
  ledOn.observe((value) => (led4.setBrightness.value = value ? 255 : 0));
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'shellyi33',
    new UDPDevice('shelly-i3.iot-ng.net.wurstsalat.cloud', 1337)
  );

  doItem(
    deviceLabel,
    'hello',
    new SingleValueSensor(doService(new Hello(), device), every30Seconds)
  );

  const button0 = new Button(
    doEventWithLog(deviceLabel, 'button0', new ButtonEvent(0), device)
  );
  button0.shortPress(() => {
    on.flip();
  });

  const button1 = new Button(
    doEventWithLog(deviceLabel, 'button1', new ButtonEvent(1), device)
  );
  button1.shortPress(() => {
    on.flip();
  });

  const button2 = new Button(
    doEventWithLog(deviceLabel, 'button2', new ButtonEvent(2), device)
  );
  button2.shortPress(() => {
    on.flip();
  });
})();

const [espNowTransport, ev1527Transport] = (() => {
  const [deviceLabel, device] = doDevice(
    'olimexEsp32Gateway',
    new UDPDevice('olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud', 1337)
  );

  doItem(
    deviceLabel,
    'hello',
    new SingleValueSensor(doService(new Hello(), device), every30Seconds)
  );

  const espNow = doEventWithLog(
    deviceLabel,
    'espNow',
    new ESPNowEvent(),
    device
  );
  const _espNowTransport = new ESPNowTransport(espNow);

  const rf433 = doEventWithLog(deviceLabel, 'rf433', new Rf433(), device);

  // rf433.observable.observe(({ value, protocol }) => {
  //   const binaryRepresentation = value.toString(2);
  //   const bitLengthPadded = Math.ceil(binaryRepresentation.length / 8) * 8;
  //   const binaryRepresentationPadded = binaryRepresentation.padStart(
  //     bitLengthPadded,
  //     '0'
  //   );
  //   const binaryRepresentationBytes = binaryRepresentationPadded
  //     .split('')
  //     .map((_value, _index) => {
  //       const index = _index + 1;

  //       if (index % 8) return _value;
  //       if (index === bitLengthPadded) return _value;

  //       return `${_value}, `;
  //     })
  //     .join('');

  //   doLog('log', [deviceLabel, 'rf433', 'protocol'], protocol);
  //   doLog('log', [deviceLabel, 'rf433', 'bits'], binaryRepresentationBytes);

  //   doLog(
  //     'log',
  //     [deviceLabel, 'ev1527', 'address'],
  //     // eslint-disable-next-line no-bitwise
  //     value >> bitLengthPayload
  //   );
  //   doLog(
  //     'log',
  //     [deviceLabel, 'ev1527', 'payload'],
  //     // eslint-disable-next-line no-bitwise
  //     `0b${(value & maxPayload).toString(2).padStart(bitLengthPayload, '0')}`
  //   );
  // });

  const _ev1527Transport = new Ev1527Transport(rf433);

  return [_espNowTransport, _ev1527Transport] as const;
})();

(() => {
  const baseLabel = 'espNowTestButton';

  (() => {
    const [deviceLabel, device] = doDevice(
      `${baseLabel}[wifi]`,
      new UDPDevice('esp-now-test-button.iot-ng.net.wurstsalat.cloud', 1337)
    );

    doItem(
      deviceLabel,
      'hello',
      new SingleValueSensor(doService(new Hello(), device), every30Seconds)
    );

    const button0 = new Button(
      doEventWithLog(deviceLabel, 'button0', new ButtonEvent(0), device)
    );
    button0.shortPress(() => {
      on.flip();
    });

    const button1 = new Button(
      doEventWithLog(deviceLabel, 'button1', new ButtonEvent(1), device)
    );
    button1.shortPress(() => {
      on.flip();
    });
  })();

  (() => {
    const [deviceLabel, device] = doDevice(
      `${baseLabel}[espNow]`,
      new ESPNowDevice(
        espNowTransport,
        // prettier-ignore
        [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf]
      )
    );

    const button0 = new Button(
      doEventWithLog(deviceLabel, 'button0', new ButtonEvent(0), device)
    );
    button0.shortPress(() => {
      on.flip();
    });

    const button1 = new Button(
      doEventWithLog(deviceLabel, 'button1', new ButtonEvent(1), device)
    );
    button1.shortPress(() => {
      on.flip();
    });

    doItem(
      deviceLabel,
      'VCC',
      new SingleValueEvent(doEvent(new VCC(), device))
    );
  })();
})();

(() => {
  const baseLabel = 'espNowTestWindowSensor';

  (() => {
    const [deviceLabel, device] = doDevice(
      `${baseLabel}[wifi]`,
      new UDPDevice(
        'esp-now-test-window-sensor.iot-ng.net.wurstsalat.cloud',
        1337
      )
    );

    doItem(
      deviceLabel,
      'hello',
      new SingleValueSensor(doService(new Hello(), device), every30Seconds)
    );

    doItem(
      deviceLabel,
      'input0',
      new SingleValueEvent(doEvent(new Input(0), device))
    );
    doItem(
      deviceLabel,
      'input1',
      new SingleValueEvent(doEvent(new Input(1), device))
    );
    doItem(
      deviceLabel,
      'input2',
      new SingleValueEvent(doEvent(new Input(2), device))
    );
  })();

  (() => {
    const [deviceLabel, device] = doDevice(
      `${baseLabel}[espNow]`,
      new ESPNowDevice(
        espNowTransport,
        // prettier-ignore
        [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0]
      )
    );

    doItem(
      deviceLabel,
      'input0',
      new SingleValueEvent(doEvent(new Input(0), device))
    );
    doItem(
      deviceLabel,
      'input1',
      new SingleValueEvent(doEvent(new Input(1), device))
    );
    doItem(
      deviceLabel,
      'input2',
      new SingleValueEvent(doEvent(new Input(2), device))
    );

    doItem(
      deviceLabel,
      'VCC',
      new SingleValueEvent(doEvent(new VCC(), device))
    );
  })();
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'blueButton',
    new Ev1527Device(ev1527Transport, 74160)
  );

  const button = doItem(
    deviceLabel,
    'button',
    new StatelessMultiValueEvent(doEvent(new Ev1527Button(), device), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ])
  );
  button.state.bottomRight.observe(() => on.flip());
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'grayButton',
    new Ev1527Device(ev1527Transport, 4448)
  );

  const button = doItem(
    deviceLabel,
    'button',
    new StatelessMultiValueEvent(doEvent(new Ev1527Button(), device), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ])
  );
  button.state.bottomRight.observe(() => on.flip());
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'orangeButton',
    new Ev1527Device(ev1527Transport, 307536)
  );

  const button = doItem(
    deviceLabel,
    'button',
    new StatelessMultiValueEvent(doEvent(new Ev1527Button(), device), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ])
  );
  button.state.bottomRight.observe(() => on.flip());
})();

(() => {
  const [deviceLabel, device] = doDevice(
    'arbeitszimmerWindowRight',
    new Ev1527Device(ev1527Transport, 839280)
  );

  doItem(
    deviceLabel,
    'sensor',
    new MultiValueEvent(doEvent(new Ev1527WindowSensor(), device), [
      'open',
      'tamperSwitch',
    ])
  );
})();
