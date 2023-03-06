import { Element, ValueType, h, matchValue } from '../../main.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { Device } from '../../../../device/main.js';
import { NullState } from '../../../../state.js';

const $resetDevice = Symbol('resetDevice');

export type ResetDeviceProps = {
  device: Device;
};

export const ResetDevice = ({ device }: ResetDeviceProps) => (
  <Trigger
    $resetDevice={$resetDevice}
    name="resetDevice"
    nullState={new NullState(() => device.triggerReset())}
    valueType={ValueType.NULL}
  />
);

export const selectorResetDevice$ = {
  ...selectTrigger(ValueType.NULL),
  $resetDevice: [matchValue, $resetDevice] as const,
};

export const matchResetDevice = (input: Element) => {
  if (!input.match(selectorResetDevice$)) return undefined;

  return {
    $: input,
  };
};
