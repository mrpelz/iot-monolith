import SunCalc from 'suncalc';

export const LATITUDE = 53.54747;
export const LONGITUDE = 10.01598;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export const radiansToDegrees = (input: number): number =>
  input * DEGREES_PER_RADIAN;

export const sunElevation = (): number => {
  const { altitude } = SunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  return radiansToDegrees(altitude);
};

export const isTwilightPhase = (
  min = -Infinity,
  max = Infinity,
  elevation = sunElevation()
): boolean => elevation > min && elevation <= max;

export const isDay = (elevation?: number): boolean =>
  isTwilightPhase(0, undefined, elevation);

export const isCivilTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-6, 0, elevation);

export const isNauticalTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-12, -6, elevation);

export const isAstronomicalTwilight = (elevation?: number): boolean =>
  isTwilightPhase(-18, -12, elevation);

export const isNight = (elevation?: number): boolean =>
  isTwilightPhase(undefined, 0, elevation);
