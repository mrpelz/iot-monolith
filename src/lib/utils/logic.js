import { EventEmitter } from 'events';
import { maxNumber } from './math.js';
import { rebind } from './oop.js';

/**
 * @typedef HysteresisOptions
 * @type {{
 *  inRangeAbove?: number,
 *  outOfRangeBelow?: number
 * }}
 */
export class Hysteresis extends EventEmitter {
  /**
   * @param {HysteresisOptions} options
   */
  constructor(options = {}) {
    const { inRangeAbove = 0, outOfRangeBelow = 0 } = options;

    if (inRangeAbove === outOfRangeBelow) {
      throw new Error('insufficient options provided');
    }

    super();

    /**
     * @type {number}
     */
    this.inRangeAbove = inRangeAbove;

    /**
     * @type {number}
     */
    this.outOfRangeBelow = outOfRangeBelow;

    /**
     * @type {boolean}
     */
    this.inRange = false;
  }

  /**
   * @param {number} input
   * @returns {boolean}
   */
  feed(input) {
    const inRange =
      input > this.inRangeAbove ||
      (this.inRange && input > this.outOfRangeBelow);

    if (inRange === this.inRange) return this.inRange;

    this.inRange = inRange;

    this.emit(this.inRange ? 'inRange' : 'outOfRange');
    this.emit('hit', this.inRange);

    return this.inRange;
  }
}

/**
 * @class PriorityValue
 * @template T
 */
export class PriorityValue {
  /**
   * @param {T} initial
   */
  constructor(initial) {
    /**
     * @type {Map<number, T>}
     */
    this._values = new Map();

    /**
     * @type {T}
     */
    this._initial = initial;

    this._reset();

    rebind(this, 'set', 'withdraw');
  }

  /**
   * @returns {number}
   */
  get priority() {
    return /** @type {number} */ (maxNumber([...this._values.keys()]));
  }

  /**
   * @returns {T | null}
   */
  get value() {
    const { priority } = this;

    return this._values.get(priority) || null;
  }

  _reset() {
    this._values.clear();
    this.set(this._initial, 0);
  }

  /**
   * @param {T} value
   * @param {number} priority
   * @returns {T | null}
   */
  set(value, priority) {
    this._values.set(priority, value);

    return this.value;
  }

  /**
   * @param {number | null} priority
   * @returns {T | null}
   */
  withdraw(priority = null) {
    if (priority === 0) throw new Error('priority 0 cannot be withdrawn');

    if (priority === null) {
      this._reset();
    } else {
      this._values.delete(priority);
    }

    return this.value;
  }
}

/**
 * @typedef Ranges
 * @type {{
 *  [key: string]: [number, number] | [number, number, boolean]
 * }[]}
 */

export class Remap {
  /**
   * @param {Ranges} ranges
   */
  constructor(ranges = []) {
    this._ranges = ranges;
  }

  /**
   * @param {string} inKey
   * @param {string} outKey
   * @param {number} input
   * @returns {number | null}
   */
  convert(inKey, outKey, input) {
    const matchingRange = this._ranges.find((range) => {
      if (!range[inKey] || !range[outKey]) return false;

      const { [inKey]: [from, to] = [] } = range;
      return (
        from !== undefined && to !== undefined && input >= from && input <= to
      );
    });

    if (!matchingRange) return null;

    const {
      [inKey]: [inFrom, inTo] = [],
      [outKey]: [outFrom, outTo, round = true] = [],
    } = matchingRange;

    if (
      inFrom === undefined ||
      inTo === undefined ||
      outFrom === undefined ||
      outTo === undefined
    ) {
      return null;
    }

    const ratio = (input - inFrom) / Math.abs(inTo - inFrom);
    const intermediate = ratio * Math.abs(outTo - outFrom) + outFrom;
    const output = round ? Math.round(intermediate) : intermediate;

    return output;
  }

  /**
   * @param {number} input
   * @returns {number | null}
   */
  aToB(input) {
    return this.convert('a', 'b', input);
  }

  /**
   * @param {number} input
   * @returns {number | null}
   */
  bToA(input) {
    return this.convert('b', 'a', input);
  }
}
