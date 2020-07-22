import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { DoorSensorState } from './door-sensors.js';
import { HttpServer } from '../../lib/http/server.js';
import { LightGroup } from '../../lib/group/index.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { Security } from '../../lib/security/index.js';
import { TelegramState } from './telegram.js';
import { Timer } from '../../lib/utils/time.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';

export type State = {
  security: Security;
};

type SecurityPersistence = {
  armed?: boolean;
  level?: number;
};

function createSecurity(telegram: TelegramState) {
  try {
    return new Security({
      telegram,
    });
  } catch (e) {
    return null;
  }
}

function addPersistenceHandler(
  instance: Security,
  securityDb: SecurityPersistence
) {
  if (!instance) return;

  const handleChange = (): void => {
    securityDb.armed = instance.armed;
    securityDb.level = instance.level;
  };

  const { armed = true, level = 0 } = securityDb || {};

  instance.arm(armed, level);

  instance.on('change', handleChange);
  handleChange();
}

export function create(_: ApplicationConfig, data: ApplicationState): void {
  const { db, telegram } = data;

  const securityDb = db.get<SecurityPersistence>('security');

  const security = createSecurity(telegram);

  if (security) {
    addPersistenceHandler(security, securityDb);
  }

  Object.defineProperty(data, 'security', {
    value: security,
  });
}

async function entryDoorTimer(
  telegram: TelegramState,
  entryDoor: DoorSensorState,
  entryDoorTimeout: number,
  entryDoorMessage: string
) {
  const { client: awaitingClient, chatIds } = telegram;
  const { instance } = entryDoor;

  const client = await awaitingClient; // wait for bot instance is available

  const messages: any[] = [];
  const deleteMessages = (): void => {
    messages.forEach((message) => {
      resolveAlways(message.delete());
    });
    messages.length = 0;
  };

  const chat = await client.addChat(chatIds.iot);
  const timer = new Timer(entryDoorTimeout);

  timer.on('hit', () => {
    chat
      .addMessage({
        text: entryDoorMessage,
      })
      .then((message: any) => {
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

function securityLightKill(
  security: Security,
  allLightsGroup: LightGroup
): void {
  security.on('change', () => {
    if (!security.armed || security.triggered) return;
    allLightsGroup.setPower(false);
  });
}

function securityDisplay(security: Security, ufiDisplay: any): void {
  security.on('change', () => {
    if (security.triggered) return;

    if (security.armed) {
      ufiDisplay.toggle(false);
    } else {
      ufiDisplay.toggle(true);
    }
  });
}

function securityToPrometheus(
  security: Security,
  prometheus: Prometheus
): void {
  prometheus.metric('security_state', {}, () => {
    return Promise.resolve(
      ((): number => {
        if (security.armDelay) return 300;
        if (security.triggered) return 400;
        if (security.armed) return 200;

        return 100;
      })()
    );
  });

  prometheus.metric('security_level', {}, () => {
    return Promise.resolve(security.armed ? security.level : null);
  });
}

function securityHmi(security: Security, hmiServer: HmiServer): void {
  const addHmi = (level: number): void => {
    const hmi = new HmiElement({
      attributes: {
        category: 'security',
        group: `§{security-system} L${level}`,
        section: 'global',
        setType: 'trigger',
        sortCategory: '_top',
        sortGroup: 'security-system',
        type: 'security',
      },
      getter: (): Promise<string> => {
        return Promise.resolve(
          ((): string => {
            if (security.level === level) {
              if (security.armDelay) return 'delayed';
              if (security.triggered) return 'triggered';
              if (security.armed) return 'on';
            }

            return 'off';
          })()
        );
      },
      name: `security${level}`,
      server: hmiServer,
      settable: true,
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

function securityHttpHooks(
  security: Security,
  httpHookServer: HttpServer
): void {
  httpHookServer.route('/security', (request: any) => {
    const {
      urlQuery: { on, lvl },
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
      handler: Promise.resolve(
        ((): string => {
          if (security.armDelay) return 'delayed';
          if (security.triggered) return 'triggered';
          if (security.armed) return 'on';

          return 'off';
        })()
      ),
    };
  });
}

export function manage(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { entryDoorTimeout, entryDoorMessage },
  } = config;

  const {
    allLightsGroup,
    doorSensors,
    hmiServer,
    httpHookServer,
    prometheus,
    security,
    telegram,
    ufiDisplay,
  } = data;

  const entryDoor = doorSensors.find(({ name }: { name: string }) => {
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
