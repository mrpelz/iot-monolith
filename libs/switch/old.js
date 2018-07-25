/* eslint strict:0 */

'use strict';

const { name: appName } = require('./package.json');
const {
  reconnectTimeout,
  propDelTimeout,
  reconnectData,
  parentScope
} = require('./config.json');

const { config } = process.env;
if (!config) {
  process.exit(1);
}

const { devices } = JSON.parse(config);

const { persistentSocket } = require('iot-tcp');
const { setLog } = require('iot-logger');
const { client } = require('iot-rpc');

const { setProperty } = client();
const log = setLog(appName);

const commands = {
  indicator: 0,
  output: 1,
  button: 2,
  blink: 3
};

// BUTTON-VALUES:
// down: 0
// up: 1
// shortpress: 2
// longpress: 3

const maxCallId = 254;
const minCallId = 1;

const notifierCallId = 0;

function callId(state) {
  const id = state.callCount;

  if (state.callCount >= maxCallId) {
    state.callCount = minCallId;
  } else {
    state.callCount += 1;
  }

  return id;
}

function handleResponse(id, state, input) {
  const { calls } = state;
  const { [id]: call } = calls;

  const [value] = input;

  if (call) {
    call(value);
    delete calls[id];
  }
}

function handleNotifier(state, input) {
  const [index, value] = input;

  const { notifiers } = state;
  const { [index]: notify } = notifiers;

  if (notify) {
    notify(value);
  }
}

function handleMessage(input, state) {
  const [id, ...payload] = input;

  if (
    id === notifierCallId &&
    payload[0] === commands.button
  ) {
    const [, ...msg] = payload;
    handleNotifier(state, msg);
  } else {
    handleResponse(id, state, payload);
  }
}

function makeCaller(callback) {
  return (value) => {
    callback(null, Boolean(value));
  };
}

function makeRequest(write, cmd, index, state, rw) {
  return (value, callback) => {
    const id = callId(state);

    const { calls } = state;

    const output = [id, cmd, index];
    if (rw) {
      output.push(Number(value));
    }

    write(Buffer.from(output));
    calls[id] = makeCaller(callback);
  };
}

function makeSetOnly(prop, cmd, index, id, state, write) {
  const propSet = setProperty(
    [parentScope, id, prop, index].join('.'),
    {
      set: makeRequest(write, cmd, index, state, true)
    }
  );

  state.props.push(propSet);
}

function makeGetSetter(prop, cmd, index, id, state, write) {
  const propSet = setProperty(
    [parentScope, id, prop, index].join('.'),
    {
      get: makeRequest(write, cmd, index, state),
      set: makeRequest(write, cmd, index, state, true)
    }
  );

  state.props.push(propSet);
}

function makeNotifier(prop, index, id, state) {
  const propSet = setProperty(
    [parentScope, id, prop, index].join('.'),
    {
      notify: true
    }
  );

  const { notify } = propSet;
  state.notifiers[index] = notify;
  state.props.push(propSet);
}

function makeProperty(prop, count, id, state, write) {
  const { [prop]: cmd } = commands;

  if (!count || cmd === undefined) {
    return;
  }

  if (count > 0) {
    for (let i = 0; i < count; i += 1) {
      switch (prop) {
        case 'button':
          makeNotifier(prop, i, id, state);
          break;
        case 'blink':
          makeSetOnly(prop, cmd, i, id, state, write);
          break;
        default:
          makeGetSetter(prop, cmd, i, id, state, write);
      }
    }
  }
}

function makePropertySet(id, capabilities, state, write) {
  let disconnectTimer = null;
  let conn = null;

  const addProps = () => {
    Object.keys(capabilities).forEach((prop) => {
      const count = capabilities[prop];
      makeProperty(prop, count, id, state, write);
    });
  };

  const delProps = () => {
    state.props.forEach((x) => {
      x.unset();
    });

    state.props.length = 0;
  };

  const onConnect = () => {
    log(`switch "${id}" is connected`, 6, {
      TYPE: 'connection',
      VALUE: true,
      NAME: id
    });

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
    } else {
      if (conn) {
        conn.notify(true);
      }

      log(`adding props for switch "${id}"`, 6, {
        TYPE: 'property_publish',
        VALUE: true,
        NAME: id
      });
      addProps();
    }
  };

  const onDisconnect = () => {
    log(`switch "${id}" is disconnected`, 5, {
      TYPE: 'connection',
      VALUE: true,
      NAME: id
    });

    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
    }

    disconnectTimer = setTimeout(() => {
      disconnectTimer = null;

      if (conn) {
        conn.notify(false);
      }

      log(`deleting props for switch "${id}"`, 5, {
        TYPE: 'property_publish',
        VALUE: false,
        NAME: id
      });
      delProps();
    }, propDelTimeout);
  };

  conn = setProperty(
    [parentScope, id, 'connection'].join('.'),
    {
      notify: true
    }
  );

  return {
    onConnect,
    onDisconnect
  };
}

devices.forEach((device) => {
  const state = {
    notifiers: {},
    calls: {},
    props: [],
    callCount: minCallId
  };

  const {
    id, host, port, capabilities
  } = device;

  const {
    connect,
    write,
    cb
  } = persistentSocket(
    host,
    port,
    {
      send: true,
      receive: true,
      time: reconnectTimeout,
      data: reconnectData
    },
    1 // one byte for message length
  );

  const {
    onConnect,
    onDisconnect
  } = makePropertySet(id, capabilities, state, write);

  cb.data = (input) => {
    handleMessage(input, state);
  };
  cb.connect = onConnect;
  cb.disconnect = onDisconnect;

  log(`connection set-up for switch "${id}"/"${host}:${port}"`, 6, {
    TYPE: 'device_setup',
    NAME: id,
    HOST: host,
    PORT: port
  });
  connect();
});
