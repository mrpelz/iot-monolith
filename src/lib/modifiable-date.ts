import { weekNumber } from './epochs.js';

export enum Unit {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
}

export enum Weekday {
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FIRDAY,
  SATURDAY,
}

export class ModifiableDate {
  private _date: Date;

  constructor(time?: Date) {
    this._date = time || new Date();
  }

  get date(): Date {
    return this._date;
  }

  get isWeekday(): boolean {
    const weekday = this._date.getDay();

    return [
      Weekday.MONDAY,
      Weekday.TUESDAY,
      Weekday.WEDNESDAY,
      Weekday.THURSDAY,
      Weekday.FIRDAY,
    ].includes(weekday);
  }

  get isWeekend(): boolean {
    const weekday = this._date.getDay();

    return [Weekday.SATURDAY, Weekday.SUNDAY].includes(weekday);
  }

  add(amount: number, unit: Unit): this {
    const _amount = Math.trunc(amount);

    // eslint-disable-next-line default-case
    switch (unit) {
      case Unit.SECOND:
        this._date.setSeconds(this.get(unit) + _amount);
        break;
      case Unit.MINUTE:
        this._date.setMinutes(this.get(unit) + _amount);
        break;
      case Unit.HOUR:
        this._date.setHours(this.get(unit) + _amount);
        break;
      case Unit.DAY:
        this._date.setDate(this.get(unit) + _amount);
        break;
      case Unit.WEEK:
        // prettier-ignore
        this._date.setDate(this.get(unit) + (_amount * 7));
        break;
      case Unit.MONTH:
        this._date.setMonth(this.get(unit) + _amount);
        break;
      case Unit.YEAR:
        this._date.setFullYear(this.get(unit) + _amount);
        break;
    }

    return this;
  }

  ceil(unit: Unit, modulo: number): this {
    const mod = Math.abs(Math.trunc(modulo));

    this.truncateToNext(unit);

    // eslint-disable-next-line default-case
    switch (unit) {
      case Unit.SECOND:
        this._date.setSeconds(Math.ceil(this.get(unit) / mod) * mod);
        break;
      case Unit.MINUTE:
        this._date.setMinutes(Math.ceil(this.get(unit) / mod) * mod);
        break;
      case Unit.HOUR:
        this._date.setHours(Math.ceil(this.get(unit) / mod) * mod);
        break;
      case Unit.DAY:
        this._date.setDate(Math.ceil(this.get(unit) / mod) * mod);
        break;
      case Unit.WEEK:
        this._date.setDate(Math.ceil(this.get(unit) / mod) * mod * 7);
        this.truncateTo(Unit.WEEK);
        break;
      case Unit.MONTH:
        this._date.setMonth(Math.ceil(this.get(unit) / mod) * mod);
        break;
      case Unit.YEAR:
        this._date.setFullYear(Math.ceil(this.get(unit) / mod) * mod);
        break;
    }

    return this;
  }

  clone(): ModifiableDate {
    return new ModifiableDate(this._date);
  }

  floor(unit: Unit, modulo: number): this {
    const mod = Math.abs(Math.trunc(modulo));

    this.truncateTo(unit);

    // eslint-disable-next-line default-case
    switch (unit) {
      case Unit.SECOND:
        this._date.setSeconds(Math.floor(this.get(unit) / mod) * mod);
        break;
      case Unit.MINUTE:
        this._date.setMinutes(Math.floor(this.get(unit) / mod) * mod);
        break;
      case Unit.HOUR:
        this._date.setHours(Math.floor(this.get(unit) / mod) * mod);
        break;
      case Unit.DAY:
        this._date.setDate(Math.floor(this.get(unit) / mod) * mod);
        break;
      case Unit.WEEK:
        this._date.setDate(Math.floor(this.get(unit) / mod) * mod * 7);
        this.truncateTo(Unit.WEEK);
        break;
      case Unit.MONTH:
        this._date.setMonth(Math.floor(this.get(unit) / mod) * mod);
        break;
      case Unit.YEAR:
        this._date.setFullYear(Math.floor(this.get(unit) / mod) * mod);
        break;
    }

    return this;
  }

  forwardUntil(matcher: Partial<Record<Unit, number>>): this {
    let advancedSmallestUnit = false;

    for (const unit of [
      Unit.SECOND,
      Unit.MINUTE,
      Unit.HOUR,
      Unit.DAY,
      Unit.WEEK,
      Unit.MONTH,
      Unit.YEAR,
    ]) {
      const value = matcher[unit];
      if (value === undefined) continue;

      if (!advancedSmallestUnit) {
        advancedSmallestUnit = true;
        this.add(1, unit);
      }

      while (this.get(unit) !== value) {
        this.add(1, unit);
      }
    }

    return this;
  }

  get(unit: Unit): number {
    switch (unit) {
      case Unit.SECOND:
        return this._date.getSeconds();
      case Unit.MINUTE:
        return this._date.getMinutes();
      case Unit.HOUR:
        return this._date.getHours();
      case Unit.DAY:
        return this._date.getDate();
      case Unit.WEEK:
        return weekNumber(this._date);
      case Unit.MONTH:
        return this._date.getMonth();
      case Unit.YEAR:
        return this._date.getFullYear();
      default:
        return 0;
    }
  }

  reverseUntil(matcher: Record<Unit, number>): this {
    let advancedSmallestUnit = false;

    for (const unit of [
      Unit.SECOND,
      Unit.MINUTE,
      Unit.HOUR,
      Unit.DAY,
      Unit.WEEK,
      Unit.MONTH,
      Unit.YEAR,
    ]) {
      const value = matcher[unit];
      if (value === undefined) continue;

      if (!advancedSmallestUnit) {
        advancedSmallestUnit = true;
        this.subtract(1, unit);
      }

      while (this.get(unit) !== value) {
        this.subtract(1, unit);
      }
    }

    return this;
  }

  round(unit: Unit, modulo: number): this {
    const mod = Math.abs(Math.trunc(modulo));

    const value = this.get(unit);

    if (Math.round(value / mod) * mod <= value) {
      this.floor(unit, modulo);

      return this;
    }

    this.ceil(unit, modulo);

    return this;
  }

  set(date: Date | number | null = null): this {
    this._date = date ? new Date(date) : new Date();

    return this;
  }

  subtract(amount: number, unit: Unit): this {
    this.add(-amount, unit);

    return this;
  }

  truncateTo(unit: Unit, inclusive = true): this {
    // eslint-disable-next-line default-case
    switch (unit) {
      case Unit.SECOND:
        this._date.setMilliseconds(0);
        break;
      case Unit.MINUTE:
        this._date.setSeconds(0);
        if (inclusive) this.truncateTo(Unit.SECOND);
        break;
      case Unit.HOUR:
        this._date.setMinutes(0);
        if (inclusive) this.truncateTo(Unit.MINUTE);
        break;
      case Unit.DAY:
        this._date.setHours(0);
        if (inclusive) this.truncateTo(Unit.HOUR);
        break;
      case Unit.WEEK:
        this._date.setDate(
          this._date.getDate() -
            (this._date.getDay() < 1 ? 6 : this._date.getDay() - 1),
        );
        if (inclusive) this.truncateTo(Unit.DAY);
        break;
      case Unit.MONTH:
        this._date.setDate(1);
        if (inclusive) this.truncateTo(Unit.DAY);
        break;
      case Unit.YEAR:
        this._date.setMonth(0);
        if (inclusive) this.truncateTo(Unit.MONTH);
        break;
    }

    return this;
  }

  truncateToNext(unit: Unit, inclusive = true): this {
    this.truncateTo(unit, inclusive);
    this.add(1, unit);

    return this;
  }

  truncateToPrevious(unit: Unit, inclusive = true): this {
    this.truncateTo(unit, inclusive);
    this.subtract(1, unit);

    return this;
  }
}
