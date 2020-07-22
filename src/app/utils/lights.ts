import { DoorSensorState } from '../modules/door-sensors.js';
import { LedLight } from '../../lib/led/index.js';
import { LightGroupState } from '../modules/light-groups.js';
import { LightState } from '../modules/lights.js';
import { RoomSensorState } from '../modules/room-sensors.js';
import { Timer } from '../../lib/utils/time.js';
import { resolveAlways } from '../../lib/utils/oop.js';

export function coupleDoorSensorToLight(
  lights: (LightState | LightGroupState)[],
  doorSensors: DoorSensorState[],
  lightName: string,
  doorSensorName: string
): void {
  const lightMatch = lights.find((light) => {
    return light.name === lightName;
  });

  const doorSensorMatch = doorSensors.find((sensor: DoorSensorState) => {
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
  lights: LightState[],
  doorSensors: DoorSensorState[],
  lightName: string,
  doorSensorName: string,
  timeout = 0
): void {
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
  let lightChanged: boolean | null = null;

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
  lights: (LightState | LightGroupState)[],
  rfSwitches: any,
  lightName: string,
  rfSwitchName: string,
  rfSwitchState: number
): void {
  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }: any) => {
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
  lights: LightState[],
  rfSwitches: any,
  lightName: string,
  rfSwitchName: string,
  rfSwitchState: number
): void {
  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }: any) => {
    return name === rfSwitchName;
  });

  if (!lightMatch || !rfSwitchMatch) {
    throw new Error('could not find light or button instance');
  }

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  if (!(lightInstance instanceof LedLight)) return;

  rfSwitchInstance.on(rfSwitchState, (repeated: boolean) => {
    resolveAlways(
      !lightInstance.power || repeated
        ? lightInstance.increase(true)
        : lightInstance.setPower(false)
    );
  });
}

export function coupleRfToggleToLight(
  lights: LightState[],
  rfSwitches: any,
  lightName: string,
  rfSwitchName: string,
  rfSwitchState: number
): void {
  const lightMatch = lights.find(({ name }) => {
    return name === lightName;
  });

  const rfSwitchMatch = rfSwitches.find(({ name }: any) => {
    return name === rfSwitchName;
  });

  if (!lightMatch || !rfSwitchMatch) {
    throw new Error('could not find light or button instance');
  }

  const { instance: lightInstance } = lightMatch;
  const { instance: rfSwitchInstance } = rfSwitchMatch;

  rfSwitchInstance.on(rfSwitchState, (repeated: boolean) => {
    resolveAlways(
      repeated && lightInstance.power
        ? lightInstance.setPower(false)
        : lightInstance.setPower(true)
    );
  });
}

export function coupleRoomSensorToLight(
  lights: LightState[],
  roomSensors: RoomSensorState[],
  lightName: string,
  roomName: string
): void {
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
  lights: LightState[] = [],
  rfSwitches: any = [],
  lightsAll: string[] = [],
  rfSwitchesAll: [string, number][] = [],
  lightsSet: string[][] = []
): void {
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

    state = state === lightsSet.length - 1 ? initialState : state + 1;

    const matchingLightsSet = lightsSet[state] || [];

    lightsAllMatches.forEach(({ name, instance }) => {
      resolveAlways(
        matchingLightsSet.includes(name)
          ? instance.setPower(true)
          : instance.setPower(false)
      );
    });
  };

  rfSwitchesAll.forEach(([switchName, switchState]) => {
    const rfSwitch = rfSwitches.find(({ name }: any) => name === switchName);
    if (!rfSwitch) return;

    rfSwitch.instance.on(switchState, callback);
  });
}
