const { parseString } = require('../../libs/utils/string');

function manageSingleRelayFan(fan, httpHookServer) {
  const { instance, name } = fan;

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', () => {
    instance.relayToggle();
  });

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { on }
    } = request;

    const handleResult = (result) => {
      return result ? 'on' : 'off';
    };

    if (on === undefined) {
      return {
        handler: instance.relayToggle().then(handleResult)
      };
    }

    return {
      handler: instance.relay(Boolean(parseString(on) || false)).then(handleResult)
    };
  });

  instance.on('change', () => {
    instance.ledBlink(instance.relayState ? 2 : 1);
  });
}

function manage(fans, httpHookServer) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SINGLE_RELAY':
        manageSingleRelayFan(fan, httpHookServer);
        break;
      default:
    }
  });
}

(function main() {
  const {
    // doorSensors,
    fans,
    httpHookServer
  } = global;

  manage(fans, httpHookServer);
}());
