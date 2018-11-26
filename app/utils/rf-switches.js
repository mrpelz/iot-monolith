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
  coupleRfSwitchToLight
};
