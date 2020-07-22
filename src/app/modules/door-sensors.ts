import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { DoorSensor } from '../../lib/door-sensor/index.js';
import { DoorSensorGroup } from '../../lib/group/index.js';
import { Ev1527ServerAggregator } from '../../lib/ev1527/index.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { Security } from '../../lib/security/index.js';

type DoorPersistence = {
  [name: string]: {
    isOpen: boolean;
  };
};

type DoorSensorsConfig = ApplicationConfig['doorSensors'];
type DoorSensorConfig = DoorSensorsConfig[number];

export type DoorSensorState = DoorSensorConfig & {
  instance: DoorSensor;
};

export type State = {
  doorSensors: DoorSensorState[];
  outwardsDoorSensorsGroup?: DoorSensorGroup;
};

function createSensor(
  sensor: DoorSensorConfig,
  server: Ev1527ServerAggregator
) {
  const { id } = sensor;

  try {
    return new DoorSensor({
      id,
      server,
    });
  } catch (e) {
    return null;
  }
}

function addPersistenceHandler(
  name: string,
  instance: DoorSensor,
  doorDb: DoorPersistence
) {
  const handleChange = () => {
    doorDb[name] = {
      isOpen: instance.isOpen,
    };
  };

  const handleInit = () => {
    const { isOpen = null } = doorDb[name] || {};

    instance.isOpen = isOpen;

    instance.on('change', handleChange);
    handleChange();
  };

  handleInit();
}

function addSecurity(
  name: string,
  instance: DoorSensor,
  alarmLevel: number | null,
  outwards: boolean,
  security: Security
) {
  let level = outwards ? 0 : 1;
  if (alarmLevel !== null) {
    level = alarmLevel;
  }

  const trigger = security.addElement(name, level);

  instance.on('change', () => {
    if (instance.isOpen) {
      trigger(true, 'was opened');
      return;
    }

    trigger(false, 'was closed');
  });
}

function createDoorSensors(
  doorSensors: DoorSensorsConfig,
  ev1527Server: Ev1527ServerAggregator,
  doorDb: DoorPersistence,
  security: Security
) {
  return doorSensors
    .map((sensor) => {
      const {
        attributes: {
          security: { alarmLevel = null, outwards = false } = {},
        } = {},
        disable = false,
        name,
        id,
      } = sensor as typeof sensor & { disable: boolean };

      if (disable || !name || !id) return null;

      const instance = createSensor(sensor, ev1527Server);
      if (!instance) return null;

      addPersistenceHandler(name, instance, doorDb);
      addSecurity(name, instance, alarmLevel, outwards, security);

      return {
        ...sensor,
        instance,
      };
    })
    .filter(Boolean) as DoorSensorState[];
}

function createOutwardsDoorSensorsGroup(allDoorSensors: DoorSensorState[]) {
  const doorSensors = allDoorSensors
    .filter((sensor) => {
      const {
        attributes: { security: { outwards = false } = {} } = {},
      } = sensor;

      return outwards;
    })
    .map(({ instance }) => {
      return instance;
    });

  try {
    return new DoorSensorGroup(doorSensors);
  } catch (e) {
    return null;
  }
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { doorSensors: doorSensorsConfig } = config;

  const { db, ev1527Server, security } = data;

  const doorDb = db.get<DoorPersistence>('doors');

  const doorSensors = createDoorSensors(
    doorSensorsConfig,
    ev1527Server,
    doorDb,
    security
  );
  const outwardsDoorSensorsGroup = createOutwardsDoorSensorsGroup(doorSensors);

  Object.defineProperty(data, 'doorSensors', {
    value: doorSensors,
  });

  if (!outwardsDoorSensorsGroup) return;

  Object.defineProperty(data, 'outwardsDoorSensorsGroup', {
    value: outwardsDoorSensorsGroup,
  });
}

function doorSensorsToPrometheus(
  doorSensors: DoorSensorState[],
  prometheus: Prometheus
) {
  doorSensors.forEach((sensor) => {
    const { name, instance } = sensor;

    const { push } = prometheus.pushMetric('door', {
      location: name,
    });

    push(instance.isOpen);

    instance.on('change', () => {
      push(instance.isOpen);
    });
  });
}

function doorSensorsHmi(doorSensors: DoorSensorState[], hmiServer: HmiServer) {
  doorSensors.forEach((doorSensor) => {
    const {
      name,
      instance,
      attributes: { hmi: hmiAttributes = null } = {},
    } = doorSensor;

    if (!hmiAttributes) return;

    const hmi = new HmiElement({
      attributes: Object.assign(
        {
          category: 'doors',
          group: 'door',
          subType: 'door',
          type: 'door-sensor',
        },
        hmiAttributes
      ),
      getter: () => {
        return Promise.resolve(
          (() => {
            if (instance.isOpen) return 'open';
            if (instance.isOpen === false) return 'close';
            return 'unknown';
          })()
        );
      },
      name,
      server: hmiServer,
    });

    instance.on('change', () => {
      hmi.update();
    });
  });
}

function outwardsDoorSensorsGroupHmi(
  instance: DoorSensorGroup,
  hmiServer: HmiServer
) {
  const hmi = new HmiElement({
    attributes: {
      category: 'security',
      group: '§{all} §{window}',
      section: 'global',
      sortCategory: '_top',
      sortGroup: 'door',
      subType: 'door',
      type: 'door-sensor',
    },
    getter: () => {
      return Promise.resolve(
        (() => {
          if (instance.isOpen) return 'open';
          if (instance.isOpen === false) return 'close';
          return 'unknown';
        })()
      );
    },
    name: 'outwardsDoorSensors',
    server: hmiServer,
  });

  instance.on('change', () => {
    hmi.update();
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const { doorSensors, hmiServer, outwardsDoorSensorsGroup, prometheus } = data;

  doorSensorsToPrometheus(doorSensors, prometheus);
  doorSensorsHmi(doorSensors, hmiServer);

  if (!outwardsDoorSensorsGroup) return;
  outwardsDoorSensorsGroupHmi(outwardsDoorSensorsGroup, hmiServer);
}
