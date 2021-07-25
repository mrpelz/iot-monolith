import {
  BooleanGroupStrategy,
  combineBooleanState,
} from '../../lib/state-group.js';
import { Meta, hierarchyToObject } from '../../lib/hierarchy.js';
import { BooleanState } from '../../lib/state.js';
import { Timer } from '../../lib/timer.js';
import { espNowButton } from '../../lib/groupings/esp-now-button.js';
import { espNowWindowSensor } from '../../lib/groupings/esp-now-window-sensor.js';
import { ev1527ButtonX1 } from '../../lib/groupings/ev1527-button.js';
import { ev1527WindowSensor } from '../../lib/groupings/ev1527-window-sensor.js';
import { every5Seconds } from '../timings.js';
import { h801 } from '../../lib/groupings/h801.js';
import { logger } from '../logging.js';
import { obiPlug } from '../../lib/groupings/obi-plug.js';
import { rfBridge as rfBridgeFactory } from '../../lib/groupings/rf-bridge.js';
import { shellyi3 } from '../../lib/groupings/shelly-i3.js';
import { testDevice } from '../../lib/groupings/test-device.js';

const log = logger.getInput({
  head: 'hierarchy-test',
});

const rfBridge = rfBridgeFactory(
  'olimex-esp32-gateway.iot-ng.net.wurstsalat.cloud'
);

const tree = {
  meta: <Meta>{
    name: 'office',
  },
  nodes: {
    blueButton: ev1527ButtonX1(rfBridge.children.ev1527Transport, 74160),
    espNowButton: espNowButton({
      espNow: {
        // prettier-ignore
        macAddress: [0x70, 0x3, 0x9f, 0x7, 0x83, 0xdf],
        transport: rfBridge.children.espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-button.iot-ng.net.wurstsalat.cloud',
      },
    }),
    espNowWindowSensor: espNowWindowSensor({
      espNow: {
        // prettier-ignore
        macAddress: [0xdc, 0x4f, 0x22, 0x57, 0xe7, 0xf0],
        transport: rfBridge.children.espNowTransport,
      },
      wifi: {
        host: 'esp-now-test-window-sensor.iot-ng.net.wurstsalat.cloud',
      },
    }),
    grayButton: ev1527ButtonX1(rfBridge.children.ev1527Transport, 4448),
    h801: h801('h801.iot-ng.net.wurstsalat.cloud'),
    obiPlug: obiPlug('obi-jack.iot-ng.net.wurstsalat.cloud'),
    orangeButton: ev1527ButtonX1(rfBridge.children.ev1527Transport, 307536),
    rfBridge,
    shellyi3: shellyi3('shelly-i3.iot-ng.net.wurstsalat.cloud'),
    testDevice: testDevice(),
    windowSensor: ev1527WindowSensor(rfBridge.children.ev1527Transport, 839280),
  },
};

const state = new BooleanState(false);

const timedOn = new BooleanState(false);
const timer = new Timer(10000);

timedOn.observe((value) => {
  if (!value) return;
  timer.start();
});
timer.observe(() => (timedOn.value = false));

const ledOn = combineBooleanState(
  BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE,
  false,
  state,
  timedOn
);

tree.nodes.testDevice.nodes.motion.state.observe((motion) => {
  if (!motion) return;
  timedOn.value = true;
});

tree.nodes.obiPlug.children.button.shortPress(() => {
  state.flip();
});

tree.nodes.shellyi3.children.button0.shortPress(() => {
  state.flip();
});
tree.nodes.shellyi3.children.button1.shortPress(() => {
  state.flip();
});
tree.nodes.shellyi3.children.button2.shortPress(() => {
  state.flip();
});

tree.nodes.blueButton.children.button.observe(() => {
  state.flip();
});
tree.nodes.grayButton.children.button.observe(() => {
  state.flip();
});
tree.nodes.orangeButton.children.button.observe(() => {
  state.flip();
});

state.observe((on) => {
  tree.nodes.obiPlug.nodes.relay.setter.value = on;
});

ledOn.observe((on) => {
  tree.nodes.h801.nodes.led0.setter.value = on;
  tree.nodes.h801.nodes.led1.setter.value = on;
  tree.nodes.h801.nodes.led2.setter.value = on;
  tree.nodes.h801.nodes.led3.setter.value = on;
  tree.nodes.h801.nodes.led4.setter.value = on;
});

every5Seconds.addTask(() => {
  log.info(() => JSON.stringify(hierarchyToObject(tree), null, 2));
});
