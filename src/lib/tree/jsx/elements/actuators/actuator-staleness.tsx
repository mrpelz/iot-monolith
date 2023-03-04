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
import { Element, ValueType, fragment, h } from '../../main.js';
import { Getter, selectGetter } from '../getter.js';
import { Device } from '../../../../device/main.js';

export type ActuatorStalenessProps<T> = {
  device: Device;
  setState: AnyReadOnlyObservable<T>;
  state: AnyReadOnlyObservable<T>;
};

export const ActuatorStaleness = <T,>({
  device,
  setState,
  state,
}: ActuatorStalenessProps<T>): Element => {
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
        measured="loading"
        name="loading"
        state={new ReadOnlyObservable(loading)}
        valueType={ValueType.BOOLEAN}
      />
      <Getter
        measured="stale"
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

export const selectorActuatorStalenessLoading = selectGetter(
  ValueType.BOOLEAN,
  'loading'
);

export const selectorActuatorStalenessStale = selectGetter(
  ValueType.BOOLEAN,
  'stale'
);
