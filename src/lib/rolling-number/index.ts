export function bitRange(count: number): number {
  return 2 ** count - 1;
}

export function byteRange(count: number): number {
  return bitRange(count * 8);
}

export const NUMBER_RANGES = {
  uint16_t: bitRange(16),
  uint32_t: bitRange(32),
  uint8_t: bitRange(8),
};

export class RollingNumber {
  private readonly _max: number;
  private readonly _min: number;
  private readonly _reserved: number[];

  private value: number;

  constructor(min: number, max: number, reserved: number[] = []) {
    this._max = max;
    this._min = min;
    this._reserved = reserved;

    this.value = min - 1;
  }

  private _next(): void {
    this.value =
      ((this.value + 1 - this._min) % (this._max + 1 - this._min)) + this._min;
  }

  get(): number {
    this._next();

    while (this._reserved.includes(this.value)) {
      this._next();
    }

    return this.value;
  }
}
