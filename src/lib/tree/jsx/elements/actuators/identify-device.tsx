import { Element, ValueType, h, matchValue } from '../../main.js';
import { Indicator, IndicatorMode } from '../../../../services/indicator.js';
import { Trigger, selectTrigger } from '../trigger.js';
import { NullState } from '../../../../state.js';

const $identifyDevice = Symbol('identifyDevice');

export type IdentifyDeviceProps = {
  indicator: Indicator;
};

export const IdentifyDevice = ({ indicator }: IdentifyDeviceProps) => (
  <Trigger
    $identifyDevice={$identifyDevice}
    name="identifyDevice"
    nullState={
      new NullState(() =>
        indicator
          .request({
            blink: 10,
            mode: IndicatorMode.BLINK,
          })
          .catch(() => {
            // noop
          })
      )
    }
    valueType={ValueType.NULL}
  />
);

export const selectorIdentifyDevice$ = {
  ...selectTrigger(ValueType.NULL),
  $identifyDevice: [matchValue, $identifyDevice] as const,
};

export const matchIdentifyDevice = (input: Element) => {
  if (!input.matchProps(selectorIdentifyDevice$)) return undefined;

  return {
    $: input,
  };
};
