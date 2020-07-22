import {
  ApplicationConfig,
  ApplicationConfigGlobals,
  ApplicationState,
} from '../app.js';
import {
  CallTiming,
  RecurringMoment,
  Scheduler,
  every,
} from '../../lib/utils/time.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { setUpConnectionHmi, setUpHistoryTrendHmi } from '../utils/hmi.js';
import { HistoryState } from './histories.js';
import { HmiConfig } from './hmi-server.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { PushMetricGroup } from '../../lib/group/index.js';
import { RoomSensor } from '../../lib/room-sensor/index.js';
import { Security } from '../../lib/security/index.js';
import { camel } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';
import { sanity } from '../../lib/utils/math.js';

type RoomSensorsConfig = ApplicationConfig['roomSensors'];
type RoomSensorConfig = RoomSensorsConfig[number];

export type RoomSensorState = RoomSensorConfig & { instance: RoomSensor };

export type State = {
  roomSensors: RoomSensorState[];
  allMovementGroup: PushMetricGroup;
};

const securityMetric = 'movement';

function createSensor(sensor: RoomSensorConfig) {
  const { disable, name, host, port, metrics = [] } = sensor;

  if (disable || !name || !metrics.length) return null;

  try {
    return new RoomSensor({
      host,
      metrics,
      port,
    });
  } catch (e) {
    return null;
  }
}

function addSchedule(
  metrics: string[],
  instance: RoomSensor,
  metricSchedule: Record<string, string>,
  scheduler: Scheduler
) {
  metrics
    .filter((metric) => {
      return Object.keys(metricSchedule).includes(metric);
    })
    .forEach((metric) => {
      const { [metric]: config } = metricSchedule;

      new RecurringMoment({ scheduler }, every.parse(config)).on('hit', () => {
        resolveAlways(instance.requestMetric(metric));
      });
    });
}

function addSecurity(name: string, instance: RoomSensor, security: Security) {
  // security element with
  // $name
  // level 1
  // graceCount 3 (movement start, movement stop, movement start)
  // graceTime of 15 seconds
  const trigger = security.addElement(name, 1, 3, 15000);

  instance.on(securityMetric, () => {
    const value = instance.getState(securityMetric);

    if (value === null) return;

    if (value) {
      trigger(true, 'movement start');
      return;
    }

    trigger(false, 'movement stop');
  });
}

function createRoomSensors(
  roomSensors: RoomSensorConfig[],
  metricSchedule: ApplicationConfigGlobals['metricSchedule'],
  scheduler: Scheduler,
  security: Security
) {
  return roomSensors
    .map((sensor) => {
      const { metrics = [], name } = sensor;

      const instance = createSensor(sensor);
      if (!instance) return null;

      instance.connect();

      addSchedule(metrics, instance, metricSchedule, scheduler);
      addSecurity(name, instance, security);

      return {
        ...sensor,
        instance,
      };
    })
    .filter(Boolean) as RoomSensorState[];
}

function createAllMovementGroup(allRoomSensors: RoomSensorState[]) {
  const roomSensors = allRoomSensors
    .filter(({ metrics }) => {
      return metrics.includes(securityMetric);
    })
    .map(({ instance }) => {
      return instance;
    });

  if (!roomSensors.length) return null;

  try {
    return new PushMetricGroup(securityMetric, roomSensors);
  } catch (e) {
    return null;
  }
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { metricSchedule },
    roomSensors: roomSensorsConfig,
  } = config;

  const { scheduler, security } = data;

  const roomSensors = createRoomSensors(
    roomSensorsConfig,
    metricSchedule,
    scheduler,
    security
  );
  const allMovementGroup = createAllMovementGroup(roomSensors);

  Object.defineProperty(data, 'roomSensors', {
    value: roomSensors,
  });

  if (allMovementGroup) {
    Object.defineProperty(data, 'allMovementGroup', {
      value: allMovementGroup,
    });
  }
}

function roomSensorsToPrometheus(
  roomSensors: RoomSensorState[],
  prometheus: Prometheus
) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if (metric === 'movement') return;
      if (metric === 'pm025') return;
      if (metric === 'pm10') return;
      if (metric === 'co') return;

      prometheus.metric(
        metric,
        {
          location: name,
          type: 'room-sensor',
        },
        () => {
          return instance.getMetric(metric);
        },
        () => {
          return instance.getMetricTime(metric);
        }
      );
    });
  });
}

function roomSensorsMovementToPrometheus(
  roomSensors: RoomSensorState[],
  prometheus: Prometheus
) {
  const metric = 'movement';

  roomSensors
    .filter(({ metrics }) => {
      return metrics.includes(metric);
    })
    .forEach((sensor) => {
      const timing = new CallTiming();

      const { name, instance } = sensor;

      prometheus.metric(
        metric,
        {
          location: name,
          type: 'room-sensor',
        },
        async () => {
          return (await instance.getMetric(metric)) || timing.check(10000);
        }
      );

      instance.on(metric, () => {
        if (!instance.getMetric(metric)) return;

        timing.hit();
      });
    });
}

function roomSensorsSlowMetricsToPrometheus(
  roomSensors: RoomSensorState[],
  prometheus: Prometheus
) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if (
        (() => {
          if (metric === 'pm025') return false;
          if (metric === 'pm10') return false;
          if (metric === 'co') return false;
          return true;
        })()
      ) {
        return;
      }

      prometheus.slowMetric(
        metric,
        {
          location: name,
          type: 'room-sensor',
        },
        () => {
          return instance.getMetric(metric, 2000);
        }
      );
    });
  });
}

function roomSensorsHmi(
  roomSensors: RoomSensorState[],
  histories: HistoryState[],
  hmiServer: HmiServer,
  unitMap: HmiConfig['unitMap'],
  valueSanity: HmiConfig['valueSanity'],
  trendFactorThreshold: HmiConfig['trendFactorThreshold']
): void {
  roomSensors.forEach((sensor) => {
    const {
      name,
      instance,
      metrics,
      attributes: { hmi: hmiAttributes = null } = {},
    } = sensor;

    setUpConnectionHmi(sensor, 'room-sensor', hmiServer);

    if (!hmiAttributes) return;

    metrics.forEach((metric) => {
      // don't show pressure for single rooms, except für metrics shown on global
      if (hmiAttributes.section !== 'global' && metric === 'pressure') return;

      const hmiName = camel(name, metric);
      const handleValue = (
        value: number | boolean | null
      ): number | string | null => {
        if (value === null || Number.isNaN(value)) return null;

        if (typeof value === 'number') {
          return sanity(
            value,
            // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
            valueSanity[metric as keyof typeof valueSanity] ||
              valueSanity.default
          );
        }

        if (typeof value === 'boolean') {
          return value ? 'yes' : 'no';
        }

        return value;
      };

      const attributes = {
        ...hmiAttributes,
        category: metric === 'movement' ? 'security' : 'air',
        group: metric,
        subType: 'single-sensor',
        type: metric === 'movement' ? 'pir' : 'environmental-sensor',
        // https://dev.to/kingdaro/indexing-objects-in-typescript-1cgi
        unit: unitMap[metric as keyof typeof unitMap] || undefined,
      };

      const hmi = new HmiElement({
        attributes,
        getter: (): unknown => {
          return instance.getMetric(metric, 2000).then(handleValue);
        },
        name: hmiName,
        server: hmiServer,
      });

      instance.on(metric, () => {
        hmi.update();
      });

      setUpHistoryTrendHmi(
        histories,
        hmiName,
        attributes,
        hmiServer,
        trendFactorThreshold
      );
    });
  });
}

function allMovementGroupHmi(instance: PushMetricGroup, hmiServer: HmiServer) {
  if (!instance) return;

  const hmi = new HmiElement({
    attributes: {
      category: 'security',
      group: 'movement',
      section: 'global',
      sortCategory: '_top',
      type: 'pir',
    },
    getter: () => {
      return Promise.resolve(instance.getState().includes(true) ? 'yes' : 'no');
    },
    name: 'allMovement',
    server: hmiServer,
  });

  instance.on('movement', () => {
    hmi.update();
  });
}

export function manage(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    hmi: { trendFactorThreshold, unitMap, valueSanity },
  } = config;

  const {
    allMovementGroup,
    histories,
    hmiServer,
    prometheus,
    roomSensors,
  } = data;

  roomSensorsToPrometheus(roomSensors, prometheus);
  roomSensorsMovementToPrometheus(roomSensors, prometheus);
  roomSensorsSlowMetricsToPrometheus(roomSensors, prometheus);
  roomSensorsHmi(
    roomSensors,
    histories,
    hmiServer,
    unitMap,
    valueSanity,
    trendFactorThreshold
  );
  allMovementGroupHmi(allMovementGroup, hmiServer);
}
