import { Scheduler } from '../../lib/utils/time';
export function create(config, data) {
    const { globals: { schedulerPrecision } } = config;
    Object.assign(data, {
        scheduler: new Scheduler(schedulerPrecision)
    });
}
//# sourceMappingURL=scheduler.js.map