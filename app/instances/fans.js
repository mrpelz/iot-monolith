const { ObiJack } = require('../../libs/obi-jack');

function createObiJackFan(fan) {
  const {
    host,
    port
  } = fan;

  try {
    return new ObiJack({
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
    const { name, type } = fan;
    if (!name || !type) return null;

    let instance;

    switch (type) {
      case 'OBI_JACK':
        instance = createObiJackFan(fan);
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
