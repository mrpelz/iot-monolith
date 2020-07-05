import { Prometheus } from '../../lib/prometheus/index.js';
export function create(config, data) {
    const { globals: { prometheusPort } } = config;
    const prometheus = new Prometheus({
        port: prometheusPort
    });
    prometheus.start();
    Object.assign(data, {
        prometheus
    });
}
//# sourceMappingURL=prometheus.js.map