import {
  ApplicationConfig,
  ApplicationConfigGlobals,
  ApplicationState,
} from '../app.js';
import {
  Ev1527Server,
  Ev1527ServerAggregator,
} from '../../lib/ev1527/index.js';
import { HmiServer } from '../../lib/hmi/index.js';
import { setUpConnectionHmi } from '../utils/hmi.js';

export type State = {
  ev1527SingleServers: Ev1527Server[];
  ev1527Server: Ev1527ServerAggregator;
};

type Ev1527ServerConfig = ApplicationConfigGlobals['ev1527'][number];

function createEv1527Server(server: Ev1527ServerConfig) {
  const { host, port } = server;

  try {
    return new Ev1527Server({
      host,
      port,
    });
  } catch (e) {
    return null;
  }
}

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    globals: { ev1527 },
  } = config;

  const servers = ev1527
    .map((server: Ev1527ServerConfig) => {
      const { disable } = server;
      if (disable) return null;

      const instance = createEv1527Server(server);
      if (!instance) return null;

      instance.connect();

      return instance;
    })
    .filter(Boolean) as Ev1527Server[];

  Object.defineProperty(data, 'ev1527SingleServers', {
    value: servers,
  });

  Object.defineProperty(data, 'ev1527Server', {
    value: new Ev1527ServerAggregator(...servers),
  });
}

function ev1527SingleServerHmi(
  ev1527SingleServers: Ev1527Server[],
  hmiServer: HmiServer
) {
  ev1527SingleServers.forEach((ev1527Server, index) => {
    const {
      _persistentSocket: {
        options: { host = null },
      },
    } = ev1527Server;
    setUpConnectionHmi(
      {
        instance: ev1527Server,
        name: host || `server${index}`,
      },
      'ev1527-server',
      hmiServer
    );
  });
}

export function manage(_: ApplicationConfig, data: ApplicationState): void {
  const { ev1527SingleServers, hmiServer } = data;

  ev1527SingleServerHmi(ev1527SingleServers, hmiServer);
}
