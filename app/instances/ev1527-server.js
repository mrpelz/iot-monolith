const { Ev1527Server, Ev1527ServerAggregator } = require('../../libs/ev1527');

function createEv1527Server(server) {
  const {
    host,
    port
  } = server;

  try {
    return new Ev1527Server({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      globals: {
        ev1527
      }
    }
  } = global;

  const servers = ev1527.map((server) => {
    const { disable = false } = server;
    if (disable) return null;

    const instance = createEv1527Server(server);
    if (!instance) return null;

    instance.connect();

    return instance;
  }).filter(Boolean);

  global.ev1527SingleServers = servers;
  global.ev1527Server = new Ev1527ServerAggregator(...servers);
}());
