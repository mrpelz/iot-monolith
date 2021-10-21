import { orchestrate } from '../lib/orchestrate.js';

export const ackBlinkFromOff = orchestrate<boolean>([
  250,
  [true, false, true, false, true],
]);

export const ackBlinkFromOn = orchestrate<boolean>([
  250,
  [false, true, false, true, false, true],
]);
