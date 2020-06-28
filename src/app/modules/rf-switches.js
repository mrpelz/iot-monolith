import { Tx118sa4 } from '../../lib/tx118sa4/index.js';

function createWallSwitch(rfSwitch, server) {
  const {
    id
  } = rfSwitch;

  try {
    return new Tx118sa4({
      id,
      server
    });
  } catch (e) {
    return null;
  }
}

function addSecurity(name, instance, security) {
  const trigger = security.addElement(name, 1);

  const onSwitch = () => {
    trigger(undefined, 'was pressed');
  };

  instance.on(1, onSwitch);
  instance.on(2, onSwitch);
  instance.on(3, onSwitch);
  instance.on(4, onSwitch);
}

export function create(config, data) {
  const {
    'rf-switches': rfSwitchesConfig
  } = config;

  const {
    ev1527Server,
    security
  } = data;

  const rfSwitches = rfSwitchesConfig.map((rfSwitch) => {
    const { disable = false, name, id } = rfSwitch;
    if (disable || !name || !id) return null;

    const instance = createWallSwitch(rfSwitch, ev1527Server);
    if (!instance) return null;

    instance.log.friendlyName(`${name} (ID: ${id})`);

    addSecurity(name, instance, security);

    return Object.assign(rfSwitch, {
      instance
    });
  }).filter(Boolean);

  Object.assign(data, {
    rfSwitches
  });
}
