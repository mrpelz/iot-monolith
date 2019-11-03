const { HmiElement } = require('../../lib/hmi');
const { Vent } = require('../../lib/vent');
const { resolveAlways } = require('../../lib/utils/oop');
const { Hysteresis } = require('../../lib/utils/logic');
const { parseString } = require('../../lib/utils/string');
const { every, RecurringMoment } = require('../../lib/utils/time');

const { setUpConnectionHmi } = require('../utils/hmi');


function createVent(ventConfig) {
  const {
    host,
    port,
    setDefaultTimeout
  } = ventConfig;

  try {
    return new Vent({
      host,
      port,
      setDefaultTimeout
    });
  } catch (e) {
    return null;
  }
}

function create(config, data) {
  const {
    vent: ventConfig
  } = config;

  const { disable = false, name, host } = ventConfig;

  if (disable || !name) return;

  const instance = createVent(ventConfig);

  if (!instance) return;

  instance.log.friendlyName(`${name} (HOST: ${host})`);
  instance.connect();

  const vent = Object.assign({}, ventConfig, {
    instance
  });

  Object.assign(data, {
    vent
  });
}


function manageVent(vent, httpHookServer) {
  if (!vent) return;

  const { instance, name } = vent;

  httpHookServer.route(`/${name}/actualIn`, () => {
    return {
      handler: instance.getActualIn().then((value) => {
        return `${value}`;
      })
    };
  });

  httpHookServer.route(`/${name}/actualOut`, () => {
    return {
      handler: instance.getActualOut().then((value) => {
        return `${value}`;
      })
    };
  });

  httpHookServer.route(`/${name}/target`, (request) => {
    const {
      urlQuery: { target }
    } = request;

    if (target === undefined) {
      return {
        handler: Promise.reject(new Error('target not set'))
      };
    }

    const set = () => {
      instance.setTarget(parseString(target));
      return instance.commitTarget();
    };

    return {
      handler: set().then((value) => {
        return `${value}`;
      })
    };
  });
}

async function createHysteresis(
  scheduler,
  vent,
  roomSensors,
  fullVentAboveHumidity,
  resetVentBelowHumidity,
  ventHumidityControlUpdate,
  telegram,
  fullVentMessage,
  resetVentMessage
) {
  if (!vent) return;

  const metric = 'humidity';

  const ventControlSensor = roomSensors.find((sensor = {}) => {
    const { name, metrics } = sensor;
    return name === 'ahuOut'
      && metrics.includes(metric);
  });

  if (!ventControlSensor) return;
  const { instance: sensorInstance } = ventControlSensor;
  const { instance: ventInstance } = vent;

  const { client: awaitingClient, chatIds } = telegram;
  const client = await awaitingClient; // wait for bot instance is available
  const chat = await client.addChat(chatIds.iot);

  const hysteresis = new Hysteresis({
    inRangeAbove: fullVentAboveHumidity,
    outOfRangeBelow: resetVentBelowHumidity
  });

  let message = null;

  hysteresis.on('inRange', () => {
    ventInstance.setTarget(ventInstance.maxTarget, 1);
    resolveAlways(ventInstance.commitTarget());

    (async () => {
      if (message) {
        await resolveAlways(message.delete());
      }
      // eslint-disable-next-line require-atomic-updates
      message = await resolveAlways(chat.addMessage({
        text: fullVentMessage
      }));
    })();
  });

  hysteresis.on('outOfRange', () => {
    ventInstance.unsetTarget(1);
    resolveAlways(ventInstance.commitTarget());

    (async () => {
      if (message) {
        await resolveAlways(message.delete());
      }
      // eslint-disable-next-line require-atomic-updates
      message = await resolveAlways(chat.addMessage({
        text: resetVentMessage
      }));
    })();
  });

  new RecurringMoment(
    { scheduler },
    every.parse(ventHumidityControlUpdate)
  ).on('hit', () => {
    resolveAlways(sensorInstance.getMetric(metric)).then((value) => {
      if (value === null) return;
      hysteresis.feed(value);
    });
  });
}

function ventToPrometheus(vent, prometheus) {
  if (!vent) return;

  const {
    instance
  } = vent;

  prometheus.metric(
    'flow_rate',
    {
      location: 'ahu-in',
      type: 'room-sensor'
    },
    instance.getActualIn
  );

  prometheus.metric(
    'flow_rate',
    {
      location: 'ahu-out',
      type: 'room-sensor'
    },
    instance.getActualOut
  );

  prometheus.metric(
    'ahu_target',
    {
      location: 'ahu'
    },
    () => {
      return Promise.resolve(instance.target);
    }
  );
}

function ventHmi(vent, hmiServer) {
  if (!vent) return;

  const { instance, name } = vent;

  setUpConnectionHmi(vent, 'vent', hmiServer);

  const hmiAttributes = {
    category: 'ahu-control',
    group: '§{ahu}-§{target}',
    section: 'ahu',
    sortCategory: '_top',
    type: 'ahu'
  };

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: `${name}ActualIn`,
    attributes: Object.assign({}, hmiAttributes, {
      group: 'ahu-in',
      sortGroup: 'flow-rate',
      subType: 'single-sensor',
      type: 'environmental-sensor',
      unit: 'm3/h'
    }),
    server: hmiServer,
    getter: () => {
      return instance.getActualIn();
    }
  });

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: `${name}ActualOut`,
    attributes: Object.assign({}, hmiAttributes, {
      group: 'ahu-out',
      sortGroup: 'flow-rate',
      subType: 'single-sensor',
      type: 'environmental-sensor',
      unit: 'm3/h'
    }),
    server: hmiServer,
    getter: () => {
      return instance.getActualOut();
    }
  });

  const hmiTarget = new HmiElement({
    name: `${name}Target`,
    attributes: Object.assign({
      subType: 'read',
      unit: 'percent'
    }, hmiAttributes),
    server: hmiServer,
    getter: () => {
      return Promise.resolve(
        instance.targetPercentage
      );
    }
  });

  const hmiTargetUp = new HmiElement({
    name: `${name}TargetUp`,
    attributes: Object.assign({
      label: 'increase',
      setType: 'trigger',
      subType: 'increase'
    }, hmiAttributes),
    server: hmiServer,
    settable: true
  });

  const hmiTargetDown = new HmiElement({
    name: `${name}TargetDown`,
    attributes: Object.assign({
      label: 'decrease',
      setType: 'trigger',
      subType: 'decrease'
    }, hmiAttributes),
    server: hmiServer,
    settable: true
  });

  instance.on('change', () => {
    hmiTarget.update();
  });

  hmiTargetUp.on('set', () => {
    const target = (
      instance.target === null
      || instance.target === instance.maxTarget
    )
      ? instance.minTarget
      : instance.target + 1;

    instance.setTarget(target);
    resolveAlways(instance.commitTarget());
  });

  hmiTargetDown.on('set', () => {
    const target = (
      instance.target === null
      || instance.target === instance.minTarget
    )
      ? instance.maxTarget
      : instance.target - 1;

    instance.setTarget(target);
    resolveAlways(instance.commitTarget());
  });
}

function manage(config, data) {
  const {
    vent: {
      fullVentAboveHumidity,
      fullVentMessage,
      resetVentBelowHumidity,
      resetVentMessage,
      ventHumidityControlUpdate
    }
  } = config;

  const {
    hmiServer,
    httpHookServer,
    prometheus,
    roomSensors,
    scheduler,
    telegram,
    vent
  } = data;

  if (!vent) return;

  manageVent(vent, httpHookServer);
  createHysteresis(
    scheduler,
    vent,
    roomSensors,
    fullVentAboveHumidity,
    resetVentBelowHumidity,
    ventHumidityControlUpdate,
    telegram,
    fullVentMessage,
    resetVentMessage
  );
  ventToPrometheus(vent, prometheus);
  ventHmi(vent, hmiServer);
}


module.exports = {
  create,
  manage
};
