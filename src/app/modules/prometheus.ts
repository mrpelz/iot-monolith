import { ApplicationConfig, ApplicationState } from '../app.js';
import { Prometheus } from '../../lib/prometheus/index.js';

export type State = {
  prometheus: Prometheus;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { prometheusPort },
  } = config;

  const prometheus = new Prometheus({
    port: prometheusPort,
  });

  prometheus.start();

  Object.defineProperty(data, 'prometheus', {
    value: prometheus,
  });
}
