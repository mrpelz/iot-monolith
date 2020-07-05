import { EPaper } from '../../lib/e-paper/index.js';
export function create(config, data) {
    const { globals: { ePaper: { disabled = false, meta, update, updateOffset, url } } } = config;
    const { hmiServer, scheduler } = data;
    if (disabled)
        return;
    const ePaper = new EPaper({
        hmiServer,
        meta,
        scheduler,
        update,
        updateOffset,
        url
    });
    ePaper.start();
    Object.assign(data, {
        ePaper
    });
}
//# sourceMappingURL=e-paper.js.map