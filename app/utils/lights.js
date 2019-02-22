const { resolveAlways } = require('../../libs/utils/oop');
const { Timer } = require('../../libs/utils/time');

function coupleDoorSensorToLight(
  lights,
  doorSensors,
  lightName,
  doorSensorName
) {
  const lightMatch = lights.find((light) => {
    return light.name === lightName;
  });

  const doorSensorMatch = doorSensors.find((sensor) => {
    return sensor.name === doorSensorName;
  });

  if (!lightMatch || !doorSensorMatch) {
    throw new Error('could not find light or door-sensor instance');
  }

  const { instance: lightInstance } = lightMatch;
  const { instance: doorSensorInstance } = doorSensorMatch;

  doorSensorInstance.on('change', () => {
    if (doorSensorInstance.isOpen && !lightInstance.power) {
      resolveAlways(lightInstance.setPower(true));
    }
  });
}

function coupleRfSwitchToLight(
  lights,
  rfSwitches,
  lightName,
  rfSwitchName,
  rfSwitchState
) {
  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }) => {
    return name === rfSwitchName;
  });

  if (!lightMatch || !rfSwitchMatch) {
    throw new Error('could not find light or button instance');
  }

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(rfSwitchState, () => {
    lightInstance.toggle();
  });
}

function coupleRfToggleToLight(
  lights,
  rfSwitches,
  lightName,
  rfSwitchName,
  rfSwitchState
) {
  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }) => {
    return name === rfSwitchName;
  });

  if (!lightMatch || !rfSwitchMatch) {
    throw new Error('could not find light or button instance');
  }

  const timer = new Timer(1500);

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(rfSwitchState, () => {
    lightInstance.setPower(!timer.isRunning);
    timer.start();
  });
}

module.exports = {
  coupleDoorSensorToLight,
  coupleRfSwitchToLight,
  coupleRfToggleToLight
};
