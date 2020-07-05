import { Base } from '../base/index.js';
import { EventEmitter } from 'events';
import { PersistentSocket } from '../tcp/index.js';
import { rebind } from '../utils/oop.js';
import { throttle } from '../utils/time.js';
const libName = 'ev1527';
const apiDelimiter = 0x0a;
const apiEncoding = 'utf8';
export class Ev1527Server extends PersistentSocket {
    constructor(options = {}) {
        const { host = null, port = 9000 } = options;
        if (!host || !port) {
            throw new Error('insufficient options provided');
        }
        super({
            host,
            port,
            keepAlive: {
                receive: true,
                time: 5000,
                useNative: false
            },
            delimiter: apiDelimiter
        });
        this._ev1527 = {};
        rebind(this, '_handlePayload');
        this.on('data', this._handlePayload);
        this.setMaxListeners(0);
        this.log.friendlyName(`Server ${host}:${port}`);
        this._ev1527.log = this.log.withPrefix(libName);
    }
    _handlePayload(input) {
        const { log } = this._ev1527;
        const payload = input.toString(apiEncoding).trim();
        log.info({
            head: 'received payload',
            attachment: payload
        });
        let data;
        try {
            data = JSON.parse(payload);
        }
        catch (error) {
            log.error({
                head: 'illegal string received',
                attachment: payload
            });
        }
        if (data) {
            this.emit('message', data);
        }
    }
}
export class Ev1527ServerAggregator extends EventEmitter {
    constructor(...servers) {
        super();
        this.setMaxListeners(0);
        servers.forEach((server) => {
            if (!(server instanceof Ev1527Server))
                throw new Error('not a ev1527-server');
            server.on('message', (data) => {
                this.emit('message', data);
            });
        });
    }
}
export class Ev1527Device extends Base {
    static prepareMatchers(matchSet) {
        const { device, states } = matchSet;
        if (!device || !states) {
            throw new Error('insufficient options provided');
        }
        const { match: globalMatch = {}, debounce: globalDebounce = 0, repeat: globalRepeat = 0 } = device;
        return Object.keys(states).map((state) => {
            const { [state]: stateOptions } = states;
            const { match = {}, debounce = globalDebounce, repeat = globalRepeat } = stateOptions;
            const repeater = throttle(repeat);
            const throttler = throttle(debounce);
            const combined = Object.assign({}, globalMatch, match);
            const matchFn = (input) => {
                return Object.keys(combined).reduce((prev, key) => {
                    if (!prev)
                        return false;
                    const { [key]: matchValue } = combined;
                    const { [key]: inputValue } = input;
                    if (typeof matchValue === 'function')
                        return matchValue(inputValue);
                    return matchValue === inputValue;
                }, true);
            };
            const matcher = (input) => {
                const matches = matchFn(input) && throttler();
                const repeating = matches ? !repeater() : false;
                return {
                    matches,
                    repeating
                };
            };
            return {
                matcher,
                state
            };
        });
    }
    constructor(options = {}) {
        const { id = null, server = null, match = null } = options;
        if (!id || !server || !match) {
            throw new Error('insufficient options provided');
        }
        super();
        this._ev1527Device = {
            id
        };
        rebind(this, '_handleMessage');
        server.on('message', this._handleMessage);
        this._ev1527Device.matchers = Ev1527Device.prepareMatchers(match);
        this.log.friendlyName(id);
        this._ev1527Device.log = this.log.withPrefix(libName);
    }
    _handleMessage(message) {
        const { matchers } = this._ev1527Device;
        matchers.forEach(({ matcher, state }) => {
            const { matches, repeating } = matcher(message);
            if (matches) {
                this.emit(state, repeating);
            }
        });
    }
}
//# sourceMappingURL=index.js.map