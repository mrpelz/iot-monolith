const { parseString } = require('../../libs/utils/string');
const { Hysteresis } = require('../../libs/utils/logic');
const { resolveAlways } = require('../../libs/utils/oop');
const { every, RecurringMoment } = require('../../libs/utils/time');

function manage(vent, httpHookServer) {
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
      handler: instance.setTarget(parseString(target))
    };
  });
}

async function createHysteresis(
  scheduler,
  vent,
  metricAggregates,
  fullVentAboveHumidity,
  resetVentBelowHumidity,
  ventHumidityControlUpdate,
  telegram,
  fullVentMessage,
  resetVentMessage
) {
  const ventControlAggregate = metricAggregates.find((aggregate = {}) => {
    const { group, type, metric } = aggregate;
    return group === 'ventControl'
    && type === 'max'
    && metric === 'humidity';
  });

  if (!ventControlAggregate) return;
  const { instance: aggregateInstance } = ventControlAggregate;
  const { instance: ventInstance } = vent;

  const { client: awaitingClient, chatIds } = telegram;
  const client = await awaitingClient; // wait for bot instance is available
  const chat = await client.addChat(chatIds.iot);

  const hysteresis = new Hysteresis({
    inRangeAbove: fullVentAboveHumidity,
    outOfRangeBelow: resetVentBelowHumidity
  });

  hysteresis.on('inRange', () => {
    resolveAlways(ventInstance.setTarget(ventInstance.maxTarget));
    chat.addMessage({
      text: fullVentMessage
    });
  });

  hysteresis.on('outOfRange', () => {
    resolveAlways(ventInstance.resetTarget());
    chat.addMessage({
      text: resetVentMessage
    });
  });

  new RecurringMoment(
    scheduler,
    every.parse(ventHumidityControlUpdate)
  ).on('hit', () => {
    resolveAlways(aggregateInstance.get()).then((value) => {
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
    metricAggregates,
    scheduler,
    telegram,
    vent
  } = global;

  if (!vent) return;

  manage(vent, httpHookServer);
  createHysteresis(
    scheduler,
    vent,
    metricAggregates,
    fullVentAboveHumidity,
    resetVentBelowHumidity,
    ventHumidityControlUpdate,
    telegram,
    fullVentMessage,
    resetVentMessage
  );
}());
