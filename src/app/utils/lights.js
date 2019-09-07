const { resolveAlways } = require('../../lib/utils/oop');
const { Timer } = require('../../lib/utils/time');

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
    if (doorSensorInstance.isOpen) {
      resolveAlways(lightInstance.setPower(true));
    }
  });
}

function coupleDoorSensorToLightTimeout(
  lights,
  doorSensors,
  lightName,
  doorSensorName,
  timeout = 0
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

  const timer = new Timer(timeout);
  let lightChanged = null;

  doorSensorInstance.on('change', () => {
    if (doorSensorInstance.isOpen && !lightInstance.power) {
      resolveAlways(lightInstance.setPower(true));
      lightChanged = false;
    } else if (!lightChanged) {
      timer.start();
    }
  });

  timer.on('hit', () => {
    resolveAlways(lightInstance.setPower(false));
  });

  lightInstance.on('set', () => {
    timer.stop();
    lightChanged = true;
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
    resolveAlways(lightInstance.toggle());
  });
}

function coupleRfSwitchToLightIncrease(
  lights,
  rfSwitches,
  lightName,
  rfSwitchName,
  rfSwitchState,
  rfSwitchLongPressTimeout
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

  const timer = new Timer(rfSwitchLongPressTimeout);

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(rfSwitchState, () => {
    resolveAlways(
      (!lightInstance.power || timer.isRunning)
        ? lightInstance.increase(true)
        : lightInstance.setPower(false)
    );

    timer.start();
  });
}

function coupleRfToggleToLight(
  lights,
  rfSwitches,
  lightName,
  rfSwitchName,
  rfSwitchState,
  rfSwitchLongPressTimeout
) {
  if (!rfSwitchLongPressTimeout) {
    throw new Error('not timeout provided');
  }

  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }) => {
    return name === rfSwitchName;
  });

  if (!lightMatch || !rfSwitchMatch) {
    throw new Error('could not find light or button instance');
  }

  const timer = new Timer(rfSwitchLongPressTimeout);

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  lightInstance.on('set', () => {
    if (!lightInstance.power) return;
    timer.start();
  });

  lightInstance.on('change', () => {
    if (lightInstance.power) return;
    timer.stop();
  });

  rfSwitchInstance.on(rfSwitchState, () => {
    resolveAlways(lightInstance.setPower(!timer.isRunning));
  });
}

function coupleRoomSensorToLight(
  lights,
  roomSensors,
  lightName,
  roomName
) {
  const light = lights.find(({ name }) => {
    return name === lightName;
  });

  const roomSensor = roomSensors.find(({ name }) => {
    return name === roomName;
  });

  if (!light || !roomSensor) {
    throw new Error('could not find light or room sensor instance');
  }

  if (!roomSensor.metrics.includes('movement')) {
    throw new Error('room sensor has no movement metric');
  }

  const { instance: lightInstance, timer: lightTimer } = light;
  const { instance: roomSensorInstance } = roomSensor;

  if (!lightTimer) {
    throw new Error('light does not have a timer/timeout');
  }

  roomSensorInstance.on('movement', () => {
    if (!lightInstance.power) return;

    if (roomSensorInstance.getState('movement')) {
      lightTimer.stop();
      return;
    }

    lightTimer.start();
  });
}

module.exports = {
  coupleDoorSensorToLight,
  coupleDoorSensorToLightTimeout,
  coupleRfSwitchToLight,
  coupleRfSwitchToLightIncrease,
  coupleRfToggleToLight,
  coupleRoomSensorToLight
};
