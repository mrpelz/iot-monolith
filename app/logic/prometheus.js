function obiLightToPrometheus(light, prometheus) {
  const { name, instance, type } = light;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'light',
      subtype: type
    }
  );

  push(instance.relayState);

  instance.on('change', () => {
    push(instance.relayState);
  });
}

function lightsToPrometheus(lights, prometheus) {
  lights.forEach((light) => {
    const { type } = light;

    switch (type) {
      case 'OBI_JACK':
        obiLightToPrometheus(light, prometheus);
        break;
      default:
    }
  });
}

function obiFanToPrometheus(fan, prometheus) {
  const { name, instance, type } = fan;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'fan',
      subtype: type
    }
  );

  push(instance.relayState);

  instance.on('change', () => {
    push(instance.relayState);
  });
}

function fansToPrometheus(fans, prometheus) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'OBI_JACK':
        obiFanToPrometheus(fan, prometheus);
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

function metricAggregatesToPrometheus(metricAggregates, prometheus) {
  metricAggregates.forEach((aggregate) => {
    const {
      group,
      instance,
      metric
    } = aggregate;

    prometheus.metric(
      metric,
      {
        location: group,
        type: 'metric-aggregate'
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
    fans,
    metricAggregates,
    prometheus,
    roomSensors
  } = global;

  lightsToPrometheus(lights, prometheus);
  fansToPrometheus(fans, prometheus);
  doorSensorsToPrometheus(doorSensors, prometheus);
  roomSensorsToPrometheus(roomSensors, prometheus);
  metricAggregatesToPrometheus(metricAggregates, prometheus);
}());
