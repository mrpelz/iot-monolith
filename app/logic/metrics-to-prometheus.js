const { prometheus, roomSensors } = global;

roomSensors.forEach((sensor) => {
  const { name, instance, metrics } = sensor;

  metrics.forEach((metric) => {
    prometheus.metric(
      metric,
      { name },
      instance.access('get', metric)
    );
  });
});
