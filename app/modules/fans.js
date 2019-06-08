const { HmiElement } = require('../../lib/hmi');
const { SingleRelay } = require('../../lib/single-relay');
const { resolveAlways } = require('../../lib/utils/oop');
const { parseString } = require('../../lib/utils/string');

const { setUpConnectionHmi } = require('../utils/hmi');


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

function create(config, data) {
  const {
    fans: fansConfig
  } = config;

  const fans = fansConfig.map((fan) => {
    const {
      disable = false,
      host,
      name,
      type
    } = fan;
    if (disable || !name || !type) return null;

    let instance;

    switch (type) {
      case 'SINGLE_RELAY':
        instance = createSingleRelayFan(fan);
        break;
      default:
    }

    if (!instance) return null;

    instance.log.friendlyName(`${name} (HOST: ${host})`);
    instance.connect();

    return Object.assign(fan, {
      instance
    });
  }).filter(Boolean);

  Object.assign(data, {
    fans
  });
}


function manageSingleRelayFan(fan, httpHookServer) {
  const { instance, name } = fan;

  instance.on('reliableConnect', () => {
    resolveAlways(instance.ledBlink(5, true));
  });

  instance.on('buttonShortpress', () => {
    resolveAlways(instance.toggle());
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

function manageFans(fans, httpHookServer) {
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

function singleRelayFanToPrometheus(fan, prometheus) {
  const { name, instance, type } = fan;

  const { push } = prometheus.pushMetric(
    'power',
    {
      name,
      type: 'fan',
      subtype: type
    }
  );

  push(instance.power);

  instance.on('change', () => {
    push(instance.power);
  });
}

function fansToPrometheus(fans, prometheus) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayFanToPrometheus(fan, prometheus);
        break;
      default:
    }
  });
}

function singleRelayFanHmi(fan, hmiServer) {
  const {
    name,
    instance,
    attributes: {
      hmi: hmiAttributes
    } = {}
  } = fan;

  setUpConnectionHmi(fan, 'single-relay fan', hmiServer);

  if (!hmiAttributes) return;

  const hmi = new HmiElement({
    name,
    attributes: Object.assign({
      category: 'other',
      group: 'fan',
      setType: 'trigger',
      type: 'fan'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(instance.power ? 'on' : 'off');
    },
    settable: true
  });

  instance.on('change', () => {
    hmi.update();
  });

  hmi.on('set', () => {
    resolveAlways(instance.toggle());
  });
}

function fansHmi(fans, hmiServer) {
  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'SINGLE_RELAY':
        singleRelayFanHmi(fan, hmiServer);
        break;
      default:
    }
  });
}

function manage(_, data) {
  const {
    // doorSensors,
    fans,
    hmiServer,
    httpHookServer,
    prometheus
  } = data;

  manageFans(fans, httpHookServer);
  fansToPrometheus(fans, prometheus);
  fansHmi(fans, hmiServer);
}


module.exports = {
  create,
  manage
};
