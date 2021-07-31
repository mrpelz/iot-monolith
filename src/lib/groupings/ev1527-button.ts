import { Ev1527Button } from '../events/ev1527-button.js';
import { Ev1527Device } from '../device/ev1527.js';
import { Ev1527Transport } from '../transport/ev1527.js';
import { StatelessMultiValueEvent } from '../items/event.js';
import { metadataStore } from '../hierarchy.js';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const ev1527ButtonX4 = (transport: Ev1527Transport, address: number) => {
  const device = new Ev1527Device(transport, address);

  const result = {
    $: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomLeft',
      'bottomRight',
      'topLeft',
      'topRight',
    ]).state,
  };

  metadataStore.set(result, {
    name: 'ev1527-button',
  });

  return result;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const ev1527ButtonX1 = (transport: Ev1527Transport, address: number) => {
  const device = new Ev1527Device(transport, address);

  const result = {
    $: new StatelessMultiValueEvent(device.addEvent(new Ev1527Button()), [
      'bottomRight',
    ]).state.bottomRight,
  };

  metadataStore.set(result, {
    name: 'ev1527-button',
  });

  return result;
};
