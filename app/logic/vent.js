const { parseString } = require('../../libs/utils/string');
const { Hysteresis } = require('../../libs/utils/logic');
const { resolveAlways } = require('../../libs/utils/oop');
const { every, RecurringMoment } = require('../../libs/utils/time');

function manage(vent, httpHookServer) {
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

    return {
      handler: instance.setTarget(parseString(target)).then((value) => {
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
    resolveAlways(ventInstance.setTarget(ventInstance.maxTarget, true));

    (async () => {
      if (message) {
        await resolveAlways(message.delete());
      }
      message = await resolveAlways(chat.addMessage({
        text: fullVentMessage
      }));
    })();
  });

  hysteresis.on('outOfRange', () => {
    resolveAlways(ventInstance.resetTarget());

    (async () => {
      if (message) {
        await resolveAlways(message.delete());
      }
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

(function main() {
  const {
    config: {
      vent: {
        fullVentAboveHumidity,
        resetVentBelowHumidity,
        fullVentMessage,
        resetVentMessage,
        ventHumidityControlUpdate
      }
    },
    httpHookServer,
    roomSensors,
    scheduler,
    telegram,
    vent
  } = global;

  if (!vent) return;

  manage(vent, httpHookServer);
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
}());
