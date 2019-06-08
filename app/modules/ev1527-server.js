const { Ev1527Server, Ev1527ServerAggregator } = require('../../lib/ev1527');

const { setUpConnectionHmi } = require('../utils/hmi');


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

function create(config, data) {
  const {
    globals: {
      ev1527
    }
  } = config;

  const servers = ev1527.map((server) => {
    const { disable = false } = server;
    if (disable) return null;

    const instance = createEv1527Server(server);
    if (!instance) return null;

    instance.connect();

    return instance;
  }).filter(Boolean);

  Object.assign(data, {
    ev1527SingleServers: servers,
    ev1527Server: new Ev1527ServerAggregator(...servers)
  });
}


function ev1527SingleServerHmi(ev1527SingleServers, hmiServer) {
  ev1527SingleServers.forEach((ev1527Server, index) => {
    const {
      _persistentSocket: {
        options: {
          host = null
        } = {}
      } = {}
    } = ev1527Server;
    setUpConnectionHmi({
      name: host || `server${index}`,
      instance: ev1527Server
    }, 'ev1527-server', hmiServer);
  });
}

function manage(_, data) {
  const {
    ev1527SingleServers,
    hmiServer
  } = data;

  ev1527SingleServerHmi(ev1527SingleServers, hmiServer);
}


module.exports = {
  create,
  manage
};
