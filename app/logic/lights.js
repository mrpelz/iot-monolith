const { HmiElement } = require('../../libs/hmi');

function manageObiJackLight(light, hmiServer) {
  const { name, instance, type } = light;

  const hmi = new HmiElement({
    name,
    attributes: {
      type
    },
    server: hmiServer,
    handlers: {
      get: () => {
        return Promise.resolve(instance.relayState);
      },
      set: (input) => {
        return instance.relay(Boolean(input));
      }
    }
  });

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', async () => {
    await instance.relay(!instance.relayState);
    instance.ledBlink(instance.relayState ? 2 : 1);
    hmi.update();
  });
}

function lightWithDoorSensor(lights, doorSensors) {
  const lightMatch = lights.find((light) => {
    return light.name === 'testLicht';
  });

  const doorSensorMatch = doorSensors.find((sensor) => {
    return sensor.name === 'wannenbad';
  });

  if (!lightMatch || !doorSensorMatch) return;

  const { instance: lightInstance } = lightMatch;
  const { instance: doorSensorInstance } = doorSensorMatch;

  doorSensorInstance.on('change', () => {
    lightInstance.relay(doorSensorInstance.isOpen);
  });
}

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

  wallSwitchInstance.on('one', () => {
    lightInstance.relay(!lightInstance.relayState);
  });
}

(function main() {
  const {
    doorSensors,
    hmiServer,
    lights,
    wallSwitches
  } = global;

  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        manageObiJackLight(light, hmiServer);
        break;
      default:
    }
  });

  lightWithDoorSensor(lights, doorSensors);
  lightWithWallSwitch(lights, wallSwitches);
}());
