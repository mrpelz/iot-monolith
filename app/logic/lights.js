function manageObiJackLight(light) {
  const { instance } = light;

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', () => {
    instance.relay(!instance.relayState);
  });

  instance.on('change', () => {
    instance.ledBlink(instance.relayState ? 2 : 1);
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
    return light.name === 'testLicht';
  });

  const wallSwitchMatch = wallSwitches.find((wallSwitch) => {
    return wallSwitch.name === 'thePushbutton';
  });

  if (!lightMatch || !wallSwitchMatch) return;

  const { instance: lightInstance } = lightMatch;
  const { instance: wallSwitchInstance } = wallSwitchMatch;

  wallSwitchInstance.on(0, () => {
    lightInstance.relay(!lightInstance.relayState);
  });
}

(function main() {
  const {
    // doorSensors,
    lights,
    wallSwitches
  } = global;

  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        manageObiJackLight(light);
        break;
      default:
    }
  });

  // lightWithDoorSensor(lights, doorSensors);
  lightWithWallSwitch(lights, wallSwitches);
}());
