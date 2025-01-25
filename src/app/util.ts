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

export const relativeSunElevationOfDay = (): number => {
  const now = new Date();

  const { solarNoon: solarNoonTime } = SunCalc.getTimes(
    now,
    LATITUDE,
    LONGITUDE
  );

  const { altitude: solarNoon } = SunCalc.getPosition(
    solarNoonTime,
    LATITUDE,
    LONGITUDE
  );
  const solarNoonAltitude = radiansToDegrees(solarNoon);

  const { altitude } = SunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  const altitudeOnRange = Math.max(radiansToDegrees(altitude), 0);

  return altitudeOnRange / solarNoonAltitude;
};

export const relativeSunElevationOfNight = (): number => {
  const now = new Date();

  const { nadir: nadirTime } = SunCalc.getTimes(now, LATITUDE, LONGITUDE);

  const { altitude: nadir } = SunCalc.getPosition(
    nadirTime,
    LATITUDE,
    LONGITUDE
  );
  const nadirAltitude = radiansToDegrees(nadir);

  const { altitude } = SunCalc.getPosition(new Date(), LATITUDE, LONGITUDE);
  const altitudeOnRange = Math.max(
    radiansToDegrees(altitude) - nadirAltitude,
    0
  );

  return altitudeOnRange / nadirAltitude + 1;
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
  isTwilightPhase(undefined, -18, elevation);
