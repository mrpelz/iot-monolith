export function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  // eslint-disable-next-line no-bitwise
  return !((year & 3 || !(year % 25)) && year & 15);
}

export function weekNumber(input: Date): number {
  const date = new Date(input.getTime());
  date.setDate(date.getDate() + 4 - (date.getDay() || 7));
  const yearStart = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  // prettier-ignore
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function startDayOfFirstWeekOfYear(year: number): Date {
  const date = new Date(0);
  date.setFullYear(year);
  date.setDate(4);

  const day = date.getDay() - 1;
  date.setDate(4 - day);

  return date;
}

export const epochs = (() => {
  const second = 1000;
  const minute = 60 * second;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const accountingMonth = 30 * day;
  const nonLeapYear = 365 * day;
  const leapYear = 366 * day;

  return {
    accountingMonth,
    day,
    hour,
    leapYear,
    minute,
    month: (m: number, y: number) => {
      return daysInMonth(m, y) * day;
    },
    nonLeapYear,
    second,
    week,
    year: (y: number) => {
      const leap = isLeapYear(y);
      return leap ? leapYear : nonLeapYear;
    },
  };
})();
