const { parseString } = require('../../libs/utils/string');

function manageObiJackLight(light, httpHookServer) {
  const { instance, name } = light;

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', () => {
    instance.relayToggle();
  });

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = (result) => {
      return result ? 'on' : 'off';
    };

    if (on === undefined) {
      return {
        handler: instance.relayToggle().then(handleResult)
      };
    }

    return {
      handler: instance.relay(Boolean(parseString(on) || false)).then(handleResult)
    };
  });

  instance.on('change', () => {
    instance.ledBlink(instance.relayState ? 2 : 1);
  });
}

function manage(lights, httpHookServer) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        manageObiJackLight(light, httpHookServer);
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
//     lightInstance.relay(doorSensorInstance.isOpen);
//   });
// }

function lightWithWallSwitch(lights, wallSwitches) {
  const lightMatch = lights.find((light) => {
    return light.name === 'kuecheLedLeft';
  });

  const wallSwitchMatch = wallSwitches.find((wallSwitch) => {
    return wallSwitch.name === 'kuecheButton1';
  });

  if (!lightMatch || !wallSwitchMatch) return;

  const { instance: lightInstance } = lightMatch;
  const { instance: wallSwitchInstance } = wallSwitchMatch;

  wallSwitchInstance.on(0, () => {
    lightInstance.relayToggle();
  });
}

(function main() {
  const {
    // doorSensors,
    lights,
    wallSwitches,
    httpHookServer
  } = global;

  manage(lights, httpHookServer);
  // lightWithDoorSensor(lights, doorSensors);
  lightWithWallSwitch(lights, wallSwitches);
}());
