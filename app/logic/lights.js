const { URL } = require('url');

const { get } = require('../../libs/http/client');
const { resolveAlways } = require('../../libs/utils/oop');
const { parseString } = require('../../libs/utils/string');
const { Timer } = require('../../libs/utils/time');
const {
  coupleDoorSensorToLight,
  coupleDoorSensorToLightTimeout,
  coupleRfSwitchToLight,
  coupleRfToggleToLight
} = require('../utils/lights');

function manageSingleRelayLight(light, httpHookServer) {
  const {
    instance,
    name,
    attributes: {
      light: {
        enableButton = false,
        timeout = 0
      } = {}
    } = {}
  } = light;

  instance.on('connect', () => {
    resolveAlways(instance.ledBlink(5, true));
  });

  if (enableButton) {
    instance.on('buttonShortpress', () => {
      resolveAlways(instance.toggle());
    });
  }

  if (timeout) {
    const timer = new Timer(timeout);

    timer.on('hit', () => {
      resolveAlways(instance.setPower(false));
    });

    instance.on('set', () => {
      timer.start();
    });
  }

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = (result) => {
      return result ? 'on' : 'off';
    };

    if (on === undefined) {
      return {
        handler: instance.toggle().then(handleResult)
      };
    }

    return {
      handler: instance.setPower(Boolean(parseString(on) || false)).then(handleResult)
    };
  });

  instance.on('change', () => {
    resolveAlways(instance.ledBlink(instance.power ? 2 : 1, true));
  });
}

function manage(lights, httpHookServer) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SINGLE_RELAY':
        manageSingleRelayLight(light, httpHookServer);
        break;
      default:
    }
  });
}

function lightWithDoorSensor(lights, doorSensors) {
  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'abstellraumDeckenlampe',
    'abstellraumDoor'
  );

  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'duschbadDeckenlampe',
    'duschbadDoor'
  );

  coupleDoorSensorToLight(
    lights,
    doorSensors,
    'wannenbadDeckenlampe',
    'wannenbadDoor'
  );

  coupleDoorSensorToLightTimeout(
    lights,
    doorSensors,
    'flurDeckenlampeFront',
    'entryDoor',
    60000
  );
}

function lightWithRfSwitch(lights, rfSwitches, rfSwitchLongPressTimeout) {
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'esszimmerWallFront',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'esszimmerWallFront',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmerWallBack',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmerWallBack',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'wohnzimmerWallBack',
    3
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmerMulti1',
    3
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmerMulti1',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'wohnzimmerMulti1',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'esszimmerMulti1',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'esszimmerMulti1',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmerMulti1',
    3
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmerButton1',
    4
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmerButton1',
    4
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmerButton2',
    4
  );

  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'abstellraumDeckenlampe',
    'abstellraumWall',
    1,
    rfSwitchLongPressTimeout
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'arbeitszimmerDeckenlampe',
    'arbeitszimmerWall',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'kuecheWallRight',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerDeckenlampe',
    'schlafzimmerWallLeft',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerDeckenlampe',
    'schlafzimmerWallRight',
    1
  );

  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'wannenbadDeckenlampe',
    'wannenbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );

  coupleRfToggleToLight(
    lights,
    rfSwitches,
    'duschbadDeckenlampe',
    'duschbadWallDoor',
    1,
    rfSwitchLongPressTimeout
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'duschbadSpiegellampe',
    'duschbadWallSink',
    1
  );
}

function arbeitszimmerDeckenlampeWithHttpHook(lights) {
  const name = 'arbeitszimmerDeckenlampe';
  const lightMatch = lights.find(({ name: n }) => {
    return n === name;
  });

  if (!lightMatch) {
    throw new Error('could not find light');
  }

  const { instance } = lightMatch;
  const url = new URL('https://hermes.net.wurstsalat.cloud/phonebutton.php');
  url.searchParams.append('change', '1');
  url.searchParams.append('symbn', name);

  instance.on('change', () => {
    url.searchParams.append('state', instance.power ? '1' : '0');
    resolveAlways(get(url));
  });
}

(function main() {
  const {
    config: {
      globals: {
        rfSwitchLongPressTimeout
      }
    },
    doorSensors,
    httpHookServer,
    lights,
    rfSwitches
  } = global;

  manage(lights, httpHookServer);
  lightWithDoorSensor(lights, doorSensors);
  lightWithRfSwitch(lights, rfSwitches, rfSwitchLongPressTimeout);
  arbeitszimmerDeckenlampeWithHttpHook(lights);
}());
