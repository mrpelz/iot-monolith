const { HmiElement } = require('../../lib/hmi');
const { camel } = require('../../lib/utils/string');
const { excludeKeys } = require('../../lib/utils/structures');

function setUpConnectionHmi(element, subGroup, hmiServer) {
  const {
    name,
    instance
  } = element;

  let connected = false;

  const hmi = new HmiElement({
    name: camel(name, 'connection'),
    attributes: {
      category: 'connections',
      group: camel(name, 'connection'),
      section: 'tech',
      setType: 'trigger',
      showSubGroup: Boolean(subGroup),
      subGroup,
      type: 'connection'
    },
    server: hmiServer,
    getter: async () => {
      return connected ? 'connected' : 'disconnected';
    },
    settable: true
  });

  instance.on('connect', () => {
    connected = true;
    hmi.update();
  });
  instance.on('disconnect', () => {
    connected = false;
    hmi.update();
  });

  hmi.on('set', () => {
    instance.reconnect();
  });
}

function setUpHistoryTrendHmi(
  histories,
  hmiName,
  attributes,
  hmiServer,
  trendFactorThreshold
) {
  const history = histories.find(({ name: n }) => {
    return n === hmiName;
  });

  if (!history) return;

  const trend = async () => {
    const { factor } = history.trend.get();

    if (factor > trendFactorThreshold) return 'trendUp';
    if (factor < (trendFactorThreshold * -1)) return 'trendDown';
    return false;
  };

  /* eslint-disable-next-line no-new */
  new HmiElement({
    name: camel(hmiName, 'trend'),
    attributes: excludeKeys(
      Object.assign({}, attributes, {
        subType: 'trend'
      }),
      'unit'
    ),
    server: hmiServer,
    getter: trend
  });
}

function setUpLightTimerHmi(timer, name, attributes, hmiServer) {
  if (!timer) return null;

  const hmiTimer = new HmiElement({
    name: camel(name, 'timer'),
    attributes: Object.assign({}, attributes, {
      group: camel(attributes.group, 'timer'),
      subGroup: 'timer'
    }),
    server: hmiServer,
    getter: () => {
      return Promise.resolve((() => {
        if (!timer.isEnabled) return 'inactive';
        if (!timer.isRunning) return 'off';
        return 'on';
      })());
    },
    settable: true
  });

  hmiTimer.on('set', () => {
    if (timer.isEnabled) {
      timer.disable();
    } else {
      timer.enable();
    }
  });

  timer.on('change', () => {
    hmiTimer.update();
  });

  return hmiTimer;
}

module.exports = {
  setUpConnectionHmi,
  setUpHistoryTrendHmi,
  setUpLightTimerHmi
};
