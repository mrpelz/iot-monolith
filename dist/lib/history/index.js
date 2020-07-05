import { calc, epochs } from '../utils/time.js';
import { EventEmitter } from 'events';
import { mean } from '../utils/math.js';
import { rebind } from '../utils/oop.js';
export class History extends EventEmitter {
    static lastItems(values, n = 1) {
        return values.slice(n * -1);
    }
    static latestItems(values, t = new Date()) {
        return values.filter(({ time }) => {
            return time.getTime() > t.getTime();
        });
    }
    constructor(options = {}) {
        const { retainHours = 24 } = options;
        if (!retainHours || typeof retainHours !== 'number') {
            throw new Error('insufficient options provided');
        }
        super();
        this._retain = retainHours * -1;
        this.values = [];
        rebind(this, 'add', 'get');
    }
    expunge() {
        const cut = calc('hour', this._retain);
        this.values = this.values.filter(({ time }) => {
            return time.getTime() > cut.getTime();
        }).sort((a, b) => {
            return a.time.getTime() - b.time.getTime();
        });
    }
    add(value, time = new Date()) {
        if (value === null || typeof value !== 'number') {
            throw new Error('no or illegal value provided');
        }
        this.values.push({
            value,
            time
        });
        this.emit('change');
    }
    get() {
        this.expunge();
        return this.values;
    }
}
export class Trend {
    constructor(options = {}) {
        const { history, nowLength = (epochs.minute * 2), meanLength = (epochs.minute * 15), max, min } = options;
        if (!history
            || !nowLength
            || !meanLength
            || max === undefined
            || min === undefined) {
            throw new Error('insufficient options provided');
        }
        if (!(history instanceof History))
            throw new Error('not a history');
        this._history = history;
        this._nowLength = nowLength;
        this._meanLength = meanLength;
        this._range = Math.abs(max - min);
    }
    get() {
        const { _history, _nowLength, _meanLength, _range } = this;
        const values = _history.get();
        if (!values.length) {
            return {
                diff: null,
                factor: null
            };
        }
        const now = Date.now();
        const meanCut = now - _meanLength;
        const nowCut = now - _nowLength;
        const meanValues = values.filter(({ time }) => {
            return time.getTime() > meanCut;
        }).map(({ value }) => { return value; });
        const nowValues = values.filter(({ time }) => {
            return time.getTime() > nowCut;
        }).map(({ value }) => { return value; });
        if (!nowValues.length || !meanValues.length) {
            return {
                diff: null,
                factor: null
            };
        }
        const diff = mean(nowValues) - mean(meanValues);
        const factor = diff / _range;
        return {
            diff,
            factor
        };
    }
}
//# sourceMappingURL=index.js.map