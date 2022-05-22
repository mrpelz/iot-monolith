import SunCalc from 'suncalc';

export const LATITUDE = 53.54747;
export const LONGITUDE = 10.01598;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export const radiansToDegrees = (input: number): number =>
  input * DEGREES_PER_RADIAN;

export const isDay = (): boolean => {
  const { altitude } = SunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);

  return radiansToDegrees(altitude) > 0;
};
