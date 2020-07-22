import { ApplicationConfig, ApplicationState } from '../app.js';
import { Ev1527ServerAggregator } from '../../lib/ev1527/index.js';
import { Security } from '../../lib/security/index.js';
import { Tx118sa4 } from '../../lib/tx118sa4/index.js';

export type rfSwitchConfig = ApplicationConfig['rfSwitches'][number];
export type rfSwitchState = rfSwitchConfig & { instance: Tx118sa4 };

export type State = {
  rfSwitches: rfSwitchState[];
};

function createWallSwitch(
  rfSwitch: rfSwitchConfig,
  server: Ev1527ServerAggregator
) {
  const { id } = rfSwitch;

  try {
    return new Tx118sa4({
      id,
      server,
    });
  } catch (e) {
    return null;
  }
}

function addSecurity(name: string, instance: Tx118sa4, security: Security) {
  const trigger = security.addElement(name, 1);

  const onSwitch = () => {
    trigger(undefined, 'was pressed');
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  instance.on(1, onSwitch);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  instance.on(2, onSwitch);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  instance.on(3, onSwitch);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  instance.on(4, onSwitch);
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { rfSwitches: rfSwitchesConfig } = config;

  const { ev1527Server, security } = data;

  const rfSwitches = rfSwitchesConfig
    .map((rfSwitch) => {
      const { disable = false, name, id } = rfSwitch as typeof rfSwitch & {
        disable: boolean;
      };
      if (disable || !name || !id) return null;

      const instance = createWallSwitch(rfSwitch, ev1527Server);
      if (!instance) return null;

      addSecurity(name, instance, security);

      return Object.assign(rfSwitch, {
        instance,
      });
    })
    .filter(Boolean) as rfSwitchState[];

  Object.defineProperty(data, 'rfSwitches', {
    value: rfSwitches,
  });
}
