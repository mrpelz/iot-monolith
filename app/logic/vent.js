const { parseString } = require('../../libs/utils/string');

function manage(vent, httpHookServer) {
  const { instance, name } = vent;

  httpHookServer.route(`/${name}`, (request) => {
    const {
      urlQuery: { target }
    } = request;

    const handleResult = (result) => {
      return result.toString(10);
    };

    if (target === undefined) {
      return {
        handler: Promise.reject(new Error('"target" not set'))
      };
    }

    return {
      handler: instance.setTarget(parseString(target)).then(handleResult)
    };
  });
}

(function main() {
  const {
    vent,
    httpHookServer
  } = global;

  manage(vent, httpHookServer);
}());
