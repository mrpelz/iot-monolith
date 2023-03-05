import {
  AnyReadOnlyObservable,
  ReadOnlyObservable,
  ReadOnlyProxyObservable,
} from '../../../../observable.js';
import {
  BooleanGroupStrategy,
  BooleanState,
  BooleanStateGroup,
} from '../../../../state.js';
import { Element, ValueType, fragment, h, matchValue } from '../../main.js';
import { Getter, selectGetter } from '../getter.js';
import { Device } from '../../../../device/main.js';

export type ActuatorStalenessProps<T> = {
  device: Device;
  setState: AnyReadOnlyObservable<T>;
  state: AnyReadOnlyObservable<T>;
};

const $loading = Symbol('loading');
const $stale = Symbol('stale');

export const ActuatorStaleness = <T,>({
  device,
  setState,
  state,
}: ActuatorStalenessProps<T>) => {
  const stale = new BooleanState(true);
  const loading = new BooleanState(true);

  state.observe((value) => {
    if (setState.value === value) return;
    loading.value = true;
  }, true);

  state.observe((value) => {
    stale.value = value === null;

    if (value !== null && setState.value !== value) return;
    loading.value = false;
  }, true);

  return (
    <>
      <Getter
        $loading={$loading}
        name="loading"
        state={new ReadOnlyObservable(loading)}
        valueType={ValueType.BOOLEAN}
      />
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
    </>
  );
};

export const selectActuatorStaleness = (input: Element) => ({
  get loading() {
    return input.matchFirstChild({
      ...selectGetter(ValueType.BOOLEAN),
      $loading: [matchValue, $loading],
    });
  },
  get stale() {
    return input.matchFirstChild({
      ...selectGetter(ValueType.BOOLEAN),
      $stale: [matchValue, $stale],
    });
  },
});
