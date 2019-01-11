const { CallTiming } = require('../../libs/utils/time');

function singleRelayLightToPrometheus(light, prometheus) {
  const { name, instance, type } = light;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'light',
      subtype: type
    }
  );

  push(instance.power);

  instance.on('change', () => {
    push(instance.power);
  });
}

function lightsToPrometheus(lights, prometheus) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayLightToPrometheus(light, prometheus);
        break;
      default:
    }
  });
}

function singleRelayLightGroupToPrometheus(group, prometheus) {
  const { name, instance, type } = group;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'light-group',
      subtype: type
    }
  );

  push(instance.power);

  instance.on('change', () => {
    push(instance.power);
  });
}

function lightGroupsToPrometheus(lightGroups, prometheus) {
  lightGroups.forEach((group) => {
    const { type } = group;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayLightGroupToPrometheus(group, prometheus);
        break;
      default:
    }
  });
}

function singleRelayFanToPrometheus(fan, prometheus) {
  const { name, instance, type } = fan;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'fan',
      subtype: type
    }
  );

  push(instance.power);

  instance.on('change', () => {
    push(instance.power);
  });
}

function fansToPrometheus(fans, prometheus) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayFanToPrometheus(fan, prometheus);
        break;
      default:
    }
  });
}

function doorSensorsToPrometheus(doorSensors, prometheus) {
  doorSensors.forEach((sensor) => {
    const { name, instance } = sensor;

    const { push } = prometheus.pushMetric(
      'door',
      {
        location: name
      }
    );

    push(instance.isOpen);

    instance.on('change', () => {
      push(instance.isOpen);
    });
  });
}

function roomSensorsToPrometheus(roomSensors, prometheus) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if (metric === 'movement') return;

      prometheus.metric(
        metric,
        {
          location: name,
          type: 'room-sensor'
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

function roomSensorsMovementToPrometheus(roomSensors, prometheus) {
  const metric = 'movement';

  roomSensors.filter(({ metrics }) => {
    return metrics.includes(metric);
  }).forEach((sensor) => {
    const timing = new CallTiming();

    const { name, instance } = sensor;

    prometheus.metric(
      metric,
      {
        location: name,
        type: 'room-sensor'
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

function metricAggregatesToPrometheus(metricAggregates, prometheus) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric,
      type
    } = aggregate;

    prometheus.metric(
      metric,
      {
        location: group,
        type: 'metric-aggregate',
        subType: type
      },
      instance.get,
      instance.getTime
    );
  });
}


(function main() {
  const {
    doorSensors,
    lights,
    lightGroups,
    fans,
    metricAggregates,
    prometheus,
    roomSensors
  } = global;

  lightsToPrometheus(lights, prometheus);
  lightGroupsToPrometheus(lightGroups, prometheus);
  fansToPrometheus(fans, prometheus);
  doorSensorsToPrometheus(doorSensors, prometheus);
  roomSensorsToPrometheus(roomSensors, prometheus);
  roomSensorsMovementToPrometheus(roomSensors, prometheus);
  metricAggregatesToPrometheus(metricAggregates, prometheus);
}());
