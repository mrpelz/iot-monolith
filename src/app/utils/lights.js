import { Timer } from '../../lib/utils/time.js';
import { resolveAlways } from '../../lib/utils/oop.js';

export function coupleDoorSensorToLight(
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

export function coupleDoorSensorToLightTimeout(
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

export function coupleRfSwitchToLight(
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

export function coupleRfSwitchToLightIncrease(
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

  rfSwitchInstance.on(rfSwitchState, (repeated) => {
    resolveAlways(
      (!lightInstance.power || repeated)
        ? lightInstance.increase(true)
        : lightInstance.setPower(false)
    );
  });
}

export function coupleRfToggleToLight(
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

  rfSwitchInstance.on(rfSwitchState, (repeated) => {
    resolveAlways(
      (repeated && lightInstance.power)
        ? lightInstance.setPower(false)
        : lightInstance.setPower(true)
    );
  });
}

export function coupleRoomSensorToLight(
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

export function coupleRfSwitchesToLightPermutations(
  lights = [],
  rfSwitches = [],
  lightsAll = [],
  rfSwitchesAll = [],
  lightsSet = []
) {
  const initialState = -1;
  let state = initialState;

  const timer = new Timer(10000);
  timer.on('hit', () => {
    state = initialState;
  });

  const lightsAllMatches = lights.filter(({ name }) => {
    return lightsAll.includes(name);
  });

  const callback = () => {
    if (!timer.isRunning) {
      timer.start();

      const on = lightsAllMatches.filter(({ instance }) => instance.power);

      if (on.length) {
        on.forEach(({ instance }) => {
          resolveAlways(instance.setPower(false));
        });

        return;
      }

      callback();
      return;
    }

    timer.start();

    state = state === (lightsSet.length - 1)
      ? initialState
      : state + 1;

    const matchingLightsSet = lightsSet[state] || [];

    lightsAllMatches.forEach(({ name, instance }) => {
      resolveAlways(matchingLightsSet.includes(name)
        ? instance.setPower(true)
        : instance.setPower(false)
      );
    });
  };

  rfSwitchesAll.forEach(([switchName, switchState]) => {
    const rfSwitch = rfSwitches.find(({ name }) => name === switchName);
    if (!rfSwitch) return;

    rfSwitch.instance.on(switchState, callback);
  });
}
