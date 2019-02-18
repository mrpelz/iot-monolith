const { parseString } = require('../../libs/utils/string');

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

(function main() {
  const {
    vent,
    httpHookServer
  } = global;

  if (!vent) return;

  manage(vent, httpHookServer);
}());
