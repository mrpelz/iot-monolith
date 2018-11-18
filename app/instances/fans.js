const { SingleRelay } = require('../../libs/single-relay');

function createSingleRelayFan(fan) {
  const {
    host,
    port
  } = fan;

  try {
    return new SingleRelay({
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
      fans
    }
  } = global;

  global.fans = fans.map((fan) => {
    const { disable = false, name, type } = fan;
    if (disable || !name || !type) return null;

    let instance;

    switch (type) {
      case 'SINGLE_RELAY':
        instance = createSingleRelayFan(fan);
        break;
      default:
    }

    if (!instance) return null;

    instance.log.friendlyName(name);
    instance.connect();

    return Object.assign(fan, {
      instance
    });
  }).filter(Boolean);
}());
