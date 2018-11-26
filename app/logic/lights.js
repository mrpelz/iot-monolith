const { parseString } = require('../../libs/utils/string');

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
    instance.ledBlink(5);
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
    instance.ledBlink(instance.power ? 2 : 1);
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

// function lightWithWallSwitch(lights, wallSwitches) {
//   const lightMatch = lights.find((light) => {
//     return light.name === 'kuecheLedLeft';
//   });

//   const wallSwitchMatch = wallSwitches.find((wallSwitch) => {
//     return wallSwitch.name === 'kuecheButton1';
//   });

//   if (!lightMatch || !wallSwitchMatch) return;

//   const { instance: lightInstance } = lightMatch;
//   const { instance: wallSwitchInstance } = wallSwitchMatch;

//   wallSwitchInstance.on(0, () => {
//     lightInstance.toggle();
//   });
// }

(function main() {
  const {
    // doorSensors,
    lights,
    // wallSwitches,
    httpHookServer
  } = global;

  manage(lights, httpHookServer);
  // lightWithDoorSensor(lights, doorSensors);
  // lightWithWallSwitch(lights, wallSwitches);
}());
