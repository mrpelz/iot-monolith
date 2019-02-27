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
      if (metric === 'pm025') return;
      if (metric === 'pm10') return;

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

function roomSensorsSlowMetricsToPrometheus(roomSensors, prometheus) {
  roomSensors.forEach((sensor) => {
    const { name, instance, metrics } = sensor;

    metrics.forEach((metric) => {
      if ((() => {
        if (metric === 'pm025') return false;
        if (metric === 'pm10') return false;
        return true;
      })()) return;

      prometheus.slowMetric(
        metric,
        {
          location: name,
          type: 'room-sensor'
        },
        () => {
          return instance.getMetric(metric, 2000);
        }
      );
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

function ventToPrometheus(vent, prometheus) {
  if (!vent) return;

  const {
    instance
  } = vent;

  prometheus.metric(
    'flow_rate',
    {
      location: 'ahu-in',
      type: 'room-sensor'
    },
    instance.getActualIn
  );

  prometheus.metric(
    'flow_rate',
    {
      location: 'ahu-out',
      type: 'room-sensor'
    },
    instance.getActualOut
  );

  prometheus.metric(
    'ahu_target',
    {
      location: 'ahu'
    },
    () => {
      return Promise.resolve(instance.target);
    }
  );
}

function securityToPrometheus(security, prometheus) {
  prometheus.metric(
    'security_state',
    {},
    () => {
      return Promise.resolve((() => {
        if (security.armDelay) return 300;
        if (security.triggered) return 400;
        if (security.armed) return 200;

        return 100;
      })());
    }
  );

  prometheus.metric(
    'security_level',
    {},
    () => {
      return Promise.resolve(security.armed ? security.level : null);
    }
  );
}


(function main() {
  const {
    doorSensors,
    lights,
    lightGroups,
    fans,
    metricAggregates,
    prometheus,
    roomSensors,
    vent,
    security
  } = global;

  lightsToPrometheus(lights, prometheus);
  lightGroupsToPrometheus(lightGroups, prometheus);
  fansToPrometheus(fans, prometheus);
  doorSensorsToPrometheus(doorSensors, prometheus);
  roomSensorsToPrometheus(roomSensors, prometheus);
  roomSensorsMovementToPrometheus(roomSensors, prometheus);
  roomSensorsSlowMetricsToPrometheus(roomSensors, prometheus);
  metricAggregatesToPrometheus(metricAggregates, prometheus);
  ventToPrometheus(vent, prometheus);
  securityToPrometheus(security, prometheus);
}());
