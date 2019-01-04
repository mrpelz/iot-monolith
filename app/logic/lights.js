const { resolveAlways } = require('../../libs/utils/oop');
const { parseString } = require('../../libs/utils/string');
const { coupleRfSwitchToLight } = require('../utils/rf-switches');

function manageSingleRelayLight(light, httpHookServer) {
  const {
    instance,
    name,
    attributes: {
      light: {
        enableButton = false
      } = {}
    } = {}
  } = light;

  instance.on('connect', () => {
    resolveAlways(instance.ledBlink(5));
  });

  if (enableButton) {
    instance.on('buttonShortpress', () => {
      instance.toggle();
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
    resolveAlways(instance.ledBlink(instance.power ? 2 : 1));
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

// function lightWithDoorSensor(lights, doorSensors) {
//   const lightMatch = lights.find((light) => {
//     return light.name === 'testLicht';
//   });

//   const doorSensorMatch = doorSensors.find((sensor) => {
//     return sensor.name === 'wannenbad';
//   });

//   if (!lightMatch || !doorSensorMatch) return;

//   const { instance: lightInstance } = lightMatch;
//   const { instance: doorSensorInstance } = doorSensorMatch;

//   doorSensorInstance.on('change', () => {
//     lightInstance.setPower(doorSensorInstance.isOpen);
//   });
// }

function lightWithRfSwitch(lights, rfSwitches) {
  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'esszimmer_wall_front',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmer_wall_back_top',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmer_wall_back_middle',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'wohnzimmer_multi_1',
    3
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerStehlampe',
    'wohnzimmer_multi_1',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'wohnzimmer_multi_1',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'wohnzimmerDeckenlampe',
    'esszimmer_multi_1',
    1
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerDeckenlampe',
    'esszimmer_multi_1',
    2
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmer_multi_1',
    3
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'esszimmerStehlampe',
    'esszimmer_button_1',
    4
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmer_button_1',
    4
  );

  coupleRfSwitchToLight(
    lights,
    rfSwitches,
    'schlafzimmerSteinlampe',
    'schlafzimmer_button_2',
    4
  );
}

(function main() {
  const {
    // doorSensors,
    httpHookServer,
    lights,
    rfSwitches
  } = global;

  manage(lights, httpHookServer);
  // lightWithDoorSensor(lights, doorSensors);
  lightWithRfSwitch(lights, rfSwitches);
}());
