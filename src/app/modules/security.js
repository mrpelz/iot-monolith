import { HmiElement } from '../../lib/hmi/index.js';
import { Security } from '../../lib/security/index.js';
import { Timer } from '../../lib/utils/time.js';
import { getKey } from '../../lib/utils/structures.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';


function createSecurity(telegram) {
  try {
    return new Security({
      telegram
    });
  } catch (e) {
    return null;
  }
}

function addPersistenceHandler(instance, securityDb) {
  if (!instance) return;

  const handleChange = () => {
    securityDb.armed = instance.armed;
    securityDb.level = instance.level;
  };

  const {
    armed = true,
    level = 0
  } = securityDb || {};

  instance.arm(armed, level);

  instance.on('change', handleChange);
  handleChange();
}

export function create(_, data) {
  const {
    db,
    telegram
  } = data;

  const securityDb = getKey(db, 'security');

  const security = createSecurity(telegram);
  addPersistenceHandler(security, securityDb);

  Object.assign(data, {
    security
  });
}


async function entryDoorTimer(telegram, entryDoor, entryDoorTimeout, entryDoorMessage) {
  const { client: awaitingClient, chatIds } = telegram;
  const { instance } = entryDoor;

  const client = await awaitingClient; // wait for bot instance is available

  const messages = [];
  const deleteMessages = () => {
    messages.forEach((message) => {
      resolveAlways(message.delete());
    });
    messages.length = 0;
  };

  const chat = await client.addChat(chatIds.iot);
  const timer = new Timer(entryDoorTimeout);

  timer.on('hit', () => {
    chat.addMessage({
      text: entryDoorMessage
    }).then((message) => {
      messages.push(message);
    });
  });

  instance.on('change', () => {
    timer.stop();

    if (!instance.isOpen) {
      deleteMessages();
      return;
    }

    timer.start();
  });
}

function securityLightKill(security, allLightsGroup) {
  security.on('change', () => {
    if (!security.armed || security.triggered) return;
    allLightsGroup.setPower(false);
  });
}

function securityDisplay(security, ufiDisplay) {
  security.on('change', () => {
    if (security.armDelay) return;
    if (security.triggered) return;

    if (security.armed) {
      ufiDisplay.toggle(false);
    } else {
      ufiDisplay.toggle(true);
    }
  });
}

function securityToPrometheus(security, prometheus) {
  prometheus.metric(
    'security_state',
    {},
    () => {
      return Promise.resolve((() => {
        if (security.armDelay) return 300;
        if (security.triggered) return 400;
        if (security.armed) return 200;

        return 100;
      })());
    }
  );

  prometheus.metric(
    'security_level',
    {},
    () => {
      return Promise.resolve(security.armed ? security.level : null);
    }
  );
}

function securityHmi(security, hmiServer) {
  const addHmi = (level) => {
    const hmi = new HmiElement({
      name: `security${level}`,
      attributes: {
        category: 'security',
        group: `§{security-system} L${level}`,
        section: 'global',
        setType: 'trigger',
        sortCategory: '_top',
        sortGroup: 'security-system',
        type: 'security'
      },
      server: hmiServer,
      getter: () => {
        return Promise.resolve((() => {
          if (security.level === level) {
            if (security.armDelay) return 'delayed';
            if (security.triggered) return 'triggered';
            if (security.armed) return 'on';
          }

          return 'off';
        })());
      },
      settable: true
    });

    security.on('change', () => {
      hmi.update();
    });

    hmi.on('set', () => {
      security.toggle(level);
    });
  };

  addHmi(1); // include levels <= 1 (e.g. alarm for when no one is home)
  addHmi(0); // include levels <= 0 (e.g. alarm for when people are sleeping)
}

function securityHttpHooks(security, httpHookServer) {
  httpHookServer.route('/security', (request) => {
    const {
      urlQuery: { on, lvl }
    } = request;

    const level = lvl === undefined ? undefined : Number.parseInt(lvl, 10);
    const arm = Boolean(parseString(on) || false);

    if (on === undefined) {
      security.toggle(level);
    } else if (arm) {
      security.delayedArm(level);
    } else {
      security.arm(false);
    }

    return {
      handler: Promise.resolve((() => {
        if (security.armDelay) return 'delayed';
        if (security.triggered) return 'triggered';
        if (security.armed) return 'on';

        return 'off';
      })())
    };
  });
}

export function manage(config, data) {
  const {
    globals: {
      entryDoorTimeout,
      entryDoorMessage
    }
  } = config;

  const {
    allLightsGroup,
    doorSensors,
    hmiServer,
    httpHookServer,
    prometheus,
    security,
    telegram,
    ufiDisplay
  } = data;

  const entryDoor = doorSensors.find(({ name }) => {
    return name === 'entryDoor';
  });
  if (!entryDoor) return;

  entryDoorTimer(telegram, entryDoor, entryDoorTimeout, entryDoorMessage);
  securityLightKill(security, allLightsGroup);
  securityDisplay(security, ufiDisplay);
  securityToPrometheus(security, prometheus);
  securityHmi(security, hmiServer);
  securityHttpHooks(security, httpHookServer);
}
