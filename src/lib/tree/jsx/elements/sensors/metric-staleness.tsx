import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
} from '../../../../state.js';
import { Element, ValueType, fragment, h, matchValue } from '../../main.js';
import { Getter, selectGetter } from '../getter.js';
import { LastSeen, matchLastSeen } from './last-seen.js';
import {
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../../observable.js';
import { Device } from '../../../../device/main.js';

export type MetricStalenessProps<T> = {
  device: Device;
  state: ReadOnlyObservable<T | null>;
};

const $stale = Symbol('stale');

export const MetricStaleness = <T,>({
  device,
  state,
}: MetricStalenessProps<T>) => {
  const stale = new BooleanState(true);

  state.observe((value) => {
    stale.value = value === null;
  }, true);

  return (
    <>
      <Getter
        $stale={$stale}
        name="stale"
        state={
          new ReadOnlyObservable(
            new BooleanStateGroup(BooleanGroupStrategy.IS_TRUE_IF_SOME_TRUE, [
              stale,
              // invert online state to be true if device is offline
              new ReadOnlyProxyObservable(device.isOnline, (online) => !online),
            ])
          )
        }
        valueType={ValueType.BOOLEAN}
      />
      <LastSeen state={state} />
    </>
  );
};

export const selectorMetricStaleness$ = {
  ...selectGetter(ValueType.BOOLEAN),
  $stale: [matchValue, $stale] as const,
};

export const matchMetricStaleness = (input: Element) => {
  if (!input.match(selectorMetricStaleness$)) return undefined;

  return {
    get lastSeen() {
      return matchLastSeen(input);
    },
    stale: input,
  };
};
