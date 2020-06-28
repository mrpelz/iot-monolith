/* eslint-disable sort-imports */
import { readConfig } from './config.js';

// create only
import * as db from './modules/db.js';

import * as ePaper from './modules/e-paper.js';
import * as histories from './modules/histories.js';
import * as hmiServer from './modules/hmi-server.js';
import * as prometheus from './modules/prometheus.js';
import * as rfSwitches from './modules/rf-switches.js';
import * as scheduler from './modules/scheduler.js';
import * as telegram from './modules/telegram.js';
import * as webApi from './modules/web-api.js';

// create and manage
import * as doorSensors from './modules/door-sensors.js';

import * as ev1527Server from './modules/ev1527-server.js';
import * as fans from './modules/fans.js';
import * as httpHooks from './modules/http-hooks.js';
import * as lightGroups from './modules/light-groups.js';
import * as lights from './modules/lights.js';
import * as metricAggregates from './modules/metric-aggregates.js';
import * as roomSensors from './modules/room-sensors.js';
import * as security from './modules/security.js';
import * as sevenSegment from './modules/seven-segment.js';
import * as vent from './modules/vent.js';

// manage only
import * as fridgeUtils from './modules/fridge-utils.js';


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

export function app(env) {
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
