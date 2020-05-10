const readConfig = require('./config');

// create only
const db = require('./modules/db');
const ePaper = require('./modules/e-paper');
const histories = require('./modules/histories');
const hmiServer = require('./modules/hmi-server');
const prometheus = require('./modules/prometheus');
const rfSwitches = require('./modules/rf-switches');
const scheduler = require('./modules/scheduler');
const telegram = require('./modules/telegram');
const webApi = require('./modules/web-api');

// create and manage
const doorSensors = require('./modules/door-sensors');
const ev1527Server = require('./modules/ev1527-server');
const fans = require('./modules/fans');
const httpHooks = require('./modules/http-hooks');
const lightGroups = require('./modules/light-groups');
const lights = require('./modules/lights');
const metricAggregates = require('./modules/metric-aggregates');
const roomSensors = require('./modules/room-sensors');
const security = require('./modules/security');
const sevenSegment = require('./modules/seven-segment');
const vent = require('./modules/vent');

// manage only
const fridgeUtils = require('./modules/fridge-utils');


function create(config, data) {
  scheduler.create(config, data);

  db.create(config, data);

  telegram.create(config, data);

  ev1527Server.create(config, data);
  hmiServer.create(config, data);
  security.create(config, data);

  roomSensors.create(config, data);

  metricAggregates.create(config, data);
  lights.create(config, data);

  doorSensors.create(config, data);
  ePaper.create(config, data);
  fans.create(config, data);
  histories.create(config, data);
  httpHooks.create(config, data);
  lightGroups.create(config, data);
  prometheus.create(config, data);
  rfSwitches.create(config, data);
  sevenSegment.create(config, data);
  vent.create(config, data);
  webApi.create(config, data);
}

function manage(config, data) {
  doorSensors.manage(config, data);
  ev1527Server.manage(config, data);
  fans.manage(config, data);
  lightGroups.manage(config, data);
  lights.manage(config, data);
  metricAggregates.manage(config, data);
  roomSensors.manage(config, data);
  security.manage(config, data);
  sevenSegment.manage(config, data);
  vent.manage(config, data);
  httpHooks.manage(config, data);

  fridgeUtils.manage(config, data);
}

function app(env) {
  const {
    configPath
  } = env;

  const data = {};
  const config = {
    env,
    ...readConfig(configPath)
  };

  create(config, data);
  manage(config, data);
}


module.exports = app;
