import { ApplicationConfig, ApplicationState } from '../app.js';
import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { Relay, RelayDriver, SonoffBasic } from '../../lib/relay/index.js';
import { HttpServer } from '../../lib/http/server.js';
import { Prometheus } from '../../lib/prometheus/index.js';
import { parseString } from '../../lib/utils/string.js';
import { resolveAlways } from '../../lib/utils/oop.js';
import { setUpConnectionHmi } from '../utils/hmi.js';

type FanDriversConfig = ApplicationConfig['fans'];
type FanDriverConfig = FanDriversConfig[number];
type FansConfig = FanDriverConfig['fans'];
type FanConfig = FansConfig[number];

export type RelayState = FanConfig & {
  instance: Relay;
};

type DriverState = FanDriverConfig & {
  instance: RelayDriver;
  fans: RelayState[];
};

export type State = {
  fans: DriverState[];
};

function createSonoffBasic(options: FanDriverConfig) {
  const { host, port } = options;

  try {
    return new SonoffBasic({
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

function createRelayFanInstance(options: FanConfig, driver: RelayDriver) {
  const { useChannel } = options;

  try {
    return new Relay({
      driver,
      useChannel,
    });
  } catch (e) {
    return null;
  }
}

function createRelayFanSets(fansOpts: FansConfig, driver: RelayDriver) {
  return fansOpts
    .map((fanOpts) => {
      const instance = createRelayFanInstance(fanOpts, driver);
      if (!instance) return null;

      return {
        ...fanOpts,
        instance,
      };
    })
    .filter(Boolean) as RelayState[];
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const { fans: fansConfig } = config;

  const fans = fansConfig
    .map((options) => {
      const {
        disable: driverDisable = false,
        host,
        fans: f = [],
        name: driverName,
        type,
      } = options as typeof options & Record<string, unknown>;

      if (driverDisable || !driverName || !type) return null;

      const fansOpts = f.filter(
        ({
          disable = false,
          name,
        }: typeof f[number] & Record<string, unknown>) => {
          return name && !disable;
        }
      );
      if (!fansOpts.length) return null;

      let driver;

      switch (type) {
        case 'SONOFF_BASIC':
          driver = createSonoffBasic(options);
          break;
        default:
      }

      if (!driver) return null;

      let fanSets;

      switch (type) {
        case 'SONOFF_BASIC':
          fanSets = createRelayFanSets(fansOpts, driver);
          break;
        default:
      }

      if (!fanSets || !fanSets.length) return null;

      driver.connect();

      return {
        ...options,
        fans: fanSets,
        instance: driver,
      };
    })
    .filter(Boolean) as DriverState[];

  Object.defineProperty(data, 'fans', {
    value: fans,
  });
}

function manageRelayFan(options: DriverState, httpHookServer: HttpServer) {
  const {
    instance: driver,
    fans = [],
    attributes: { driver: { enableButton = false } = {} } = {},
  } = options;

  driver.on('reliableConnect', () => {
    resolveAlways(driver.indicatorBlink(5, true));
  });

  // https://github.com/microsoft/TypeScript/issues/33591
  (fans as typeof fans[number][]).forEach((fan, index) => {
    const { instance, name } = fan;

    if (index === 0) {
      instance.on('change', () => {
        resolveAlways(
          instance.driver.indicatorBlink(instance.power ? 2 : 1, true)
        );
      });

      if (enableButton) {
        instance.driver.on('button0Shortpress', () => {
          resolveAlways(instance.toggle());
        });
      }
    }

    httpHookServer.route(`/${name}`, (request: any) => {
      const {
        urlQuery: { on },
      } = request;

      const handleResult = (result: any) => {
        return result ? 'on' : 'off';
      };

      if (on === undefined) {
        return {
          handler: instance.toggle().then(handleResult),
        };
      }

      return {
        handler: instance
          .setPower(Boolean(parseString(on) || false))
          .then(handleResult),
      };
    });
  });
}

function manageFans(fans: DriverState[], httpHookServer: HttpServer) {
  fans.forEach((options) => {
    const { type } = options;

    switch (type) {
      case 'SONOFF_BASIC':
        manageRelayFan(options, httpHookServer);
        break;
      default:
    }
  });
}

function relayFanToPrometheus(options: DriverState, prometheus: Prometheus) {
  const { fans = [], type } = options;

  // https://github.com/microsoft/TypeScript/issues/33591
  (fans as typeof fans[number][]).forEach((fan) => {
    const { name, instance } = fan;

    const { push } = prometheus.pushMetric('power', {
      name,
      subtype: type,
      type: 'fan',
    });

    push(instance.power);

    instance.on('change', () => {
      push(instance.power);
    });
  });
}

function fansToPrometheus(fans: DriverState[], prometheus: Prometheus) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SONOFF_BASIC':
        relayFanToPrometheus(fan, prometheus);
        break;
      default:
    }
  });
}

function relayFanHmi(options: DriverState, hmiServer: HmiServer) {
  const { fans = [] } = options;

  setUpConnectionHmi(options, 'relay fan', hmiServer);

  // https://github.com/microsoft/TypeScript/issues/33591
  (fans as typeof fans[number][]).forEach((fan) => {
    const {
      name,
      instance,
      attributes: { hmi: hmiDefaults = null } = {},
    } = fan;

    if (!hmiDefaults) return;

    const hmiAttributes = Object.assign(
      {
        category: 'other',
        group: 'fan',
        setType: 'trigger',
        type: 'fan',
      },
      hmiDefaults
    );

    const hmi = new HmiElement({
      attributes: Object.assign(
        {
          subGroup: 'trigger',
        },
        hmiAttributes
      ),
      getter: () => {
        return Promise.resolve(instance.power ? 'on' : 'off');
      },
      name,
      server: hmiServer,
      settable: true,
    });

    instance.on('change', () => {
      hmi.update();
    });

    hmi.on('set', () => {
      resolveAlways(instance.toggle());
    });
  });
}

function fansHmi(fans: DriverState[], hmiServer: HmiServer) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SONOFF_BASIC':
        relayFanHmi(fan, hmiServer);
        break;
      default:
    }
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const { hmiServer, httpHookServer, fans, prometheus } = data;

  manageFans(fans, httpHookServer);
  fansToPrometheus(fans, prometheus);
  fansHmi(fans, hmiServer);
}
