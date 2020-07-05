import { Relay, SonoffBasic } from '../../lib/relay/index.js';
import { HmiElement } from '../../lib/hmi/index.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';
import { setUpConnectionHmi } from '../utils/hmi.js';
function createSonoffBasic(options) {
    const { host, port } = options;
    try {
        return new SonoffBasic({
            host,
            port
        });
    }
    catch (e) {
        return null;
    }
}
function createRelayFanInstance(options, driver) {
    const { useChannel } = options;
    try {
        return new Relay({
            driver,
            useChannel
        });
    }
    catch (e) {
        return null;
    }
}
function createRelayFanSets(fansOpts, driver, host) {
    return fansOpts.map((fanOpts) => {
        const { name } = fanOpts;
        const instance = createRelayFanInstance(fanOpts, driver);
        if (!instance)
            return null;
        instance.log.friendlyName(`${name} (HOST: ${host})`);
        return Object.assign(fanOpts, {
            instance
        });
    }).filter(Boolean);
}
export function create(config, data) {
    const { fans: fansConfig } = config;
    const fans = fansConfig.map((options) => {
        const { disable: driverDisable = false, host, fans: f = [], name: driverName, type } = options;
        if (driverDisable || !driverName || !type)
            return null;
        const fansOpts = f.filter(({ disable = false, name }) => {
            return name && !disable;
        });
        if (!fansOpts.length)
            return null;
        let driver;
        switch (type) {
            case 'SONOFF_BASIC':
                driver = createSonoffBasic(options);
                break;
            default:
        }
        if (!driver)
            return null;
        driver.log.friendlyName(`${driverName} (HOST: ${host})`);
        let fanSets;
        switch (type) {
            case 'SONOFF_BASIC':
                fanSets = createRelayFanSets(fansOpts, driver, host);
                break;
            default:
        }
        if (!fanSets || !fanSets.length)
            return null;
        driver.connect();
        return Object.assign(options, {
            instance: driver,
            fans: fanSets
        });
    }).filter(Boolean);
    Object.assign(data, {
        fans
    });
}
function manageRelayFan(options, httpHookServer) {
    const { instance: driver, fans = [], attributes: { driver: { enableButton = false } = {} } = {} } = options;
    driver.on('reliableConnect', () => {
        resolveAlways(driver.indicatorBlink(5, true));
    });
    fans.forEach((fan, index) => {
        const { instance, name } = fan;
        if (index === 0) {
            instance.on('change', () => {
                resolveAlways(instance.driver.indicatorBlink(instance.power ? 2 : 1, true));
            });
            if (enableButton) {
                instance.driver.on('button0Shortpress', () => {
                    resolveAlways(instance.toggle());
                });
            }
        }
        httpHookServer.route(`/${name}`, (request) => {
            const { urlQuery: { on } } = request;
            const handleResult = (result) => {
                return result ? 'on' : 'off';
            };
            if (on === undefined) {
                return {
                    handler: instance.toggle().then(handleResult)
                };
            }
            return {
                handler: instance.setPower(Boolean(parseString(on) || false)).then(handleResult)
            };
        });
    });
}
function manageFans(fans, httpHookServer) {
    fans.forEach((options) => {
        const { type } = options;
        switch (type) {
            case 'SONOFF_BASIC':
                manageRelayFan(options, httpHookServer);
                break;
            default:
        }
    });
}
function relayFanToPrometheus(options, prometheus) {
    const { fans = [], type } = options;
    fans.forEach((fan) => {
        const { name, instance } = fan;
        const { push } = prometheus.pushMetric('power', {
            name,
            type: 'fan',
            subtype: type
        });
        push(instance.power);
        instance.on('change', () => {
            push(instance.power);
        });
    });
}
function fansToPrometheus(fans, prometheus) {
    fans.forEach((fan) => {
        const { type } = fan;
        switch (type) {
            case 'SONOFF_BASIC':
                relayFanToPrometheus(fan, prometheus);
                break;
            default:
        }
    });
}
function relayFanHmi(options, hmiServer) {
    const { fans = [] } = options;
    setUpConnectionHmi(options, 'relay fan', hmiServer);
    fans.forEach((fan) => {
        const { name, instance, attributes: { hmi: hmiDefaults = null } = {} } = fan;
        if (!hmiDefaults)
            return;
        const hmiAttributes = Object.assign({
            category: 'other',
            group: 'fan',
            setType: 'trigger',
            type: 'fan'
        }, hmiDefaults);
        const hmi = new HmiElement({
            name,
            attributes: Object.assign({
                subGroup: 'trigger'
            }, hmiAttributes),
            server: hmiServer,
            getter: () => {
                return Promise.resolve(instance.power ? 'on' : 'off');
            },
            settable: true
        });
        instance.on('change', () => {
            hmi.update();
        });
        hmi.on('set', () => {
            resolveAlways(instance.toggle());
        });
    });
}
function fansHmi(fans, hmiServer) {
    fans.forEach((fan) => {
        const { type } = fan;
        switch (type) {
            case 'SONOFF_BASIC':
                relayFanHmi(fan, hmiServer);
                break;
            default:
        }
    });
}
export function manage(_, data) {
    const { hmiServer, httpHookServer, fans, prometheus } = data;
    manageFans(fans, httpHookServer);
    fansToPrometheus(fans, prometheus);
    fansHmi(fans, hmiServer);
}
//# sourceMappingURL=fans.js.map