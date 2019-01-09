const { resolveAlways } = require('../../libs/utils/oop');
const { parseString } = require('../../libs/utils/string');

function manageSingleRelayFan(fan, httpHookServer) {
  const { instance, name } = fan;

  instance.on('connect', () => {
    resolveAlways(instance.ledBlink(5, true));
  });

  instance.on('buttonShortpress', () => {
    instance.toggle();
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
        handler: instance.toggle().then(handleResult)
      };
    }

    return {
      handler: instance.setPower(Boolean(parseString(on) || false)).then(handleResult)
    };
  });

  instance.on('change', () => {
    resolveAlways(instance.ledBlink(instance.power ? 2 : 1, true));
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
