export class RollingNumber {
  private readonly _max: number;
  private readonly _min: number;
  private readonly _reserved: number[];
  private _value: number;

  constructor(min: number, max: number, reserved: number[] = []) {
    this._max = max;
    this._min = min;
    this._reserved = reserved;

    this._value = min - 1;
  }

  private _next(): void {
    this._value =
      ((this._value + 1 - this._min) % (this._max + 1 - this._min)) + this._min;
  }

  get(): number {
    this._next();

    while (this._reserved.includes(this._value)) {
      this._next();
    }

    return this._value;
  }
}
