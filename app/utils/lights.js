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

  if (!lightMatch || !doorSensorMatch) return;

  const { instance: lightInstance } = lightMatch;
  const { instance: doorSensorInstance } = doorSensorMatch;

  doorSensorInstance.on('change', () => {
    lightInstance.setPower(doorSensorInstance.isOpen);
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

  if (!lightMatch || !rfSwitchMatch) return;

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(rfSwitchState, () => {
    lightInstance.toggle();
  });
}

module.exports = {
  coupleDoorSensorToLight,
  coupleRfSwitchToLight
};
