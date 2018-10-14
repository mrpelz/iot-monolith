function obiLightToPrometheus(light, prometheus) {
  const { name, instance, type } = light;

  prometheus.metric(
    'power',
    {
      name,
      type: 'light',
      subtype: type
    },
    () => {
      return Promise.resolve(instance.relayState);
    }
  );
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

  prometheus.metric(
    'power',
    {
      name,
      type: 'fan',
      subtype: type
    },
    () => {
      return Promise.resolve(instance.relayState);
    }
  );
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

    prometheus.metric(
      'door',
      {
        location: name
      },
      () => {
        return Promise.resolve(instance.isOpen);
      }
    );
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
        }
      );
    });
  });
}

function metricAggregatesToPrometheus(metricAggregates, prometheus) {
  metricAggregates.forEach((aggregate) => {
    const { group, metric, instance } = aggregate;

    prometheus.metric(
      metric,
      {
        location: group,
        type: 'metric-aggregate'
      },
      instance.get
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
