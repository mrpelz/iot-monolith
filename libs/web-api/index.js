const { HttpServer } = require('../http/server');
const { rebind, resolveAlways } = require('../utils/oop');
const { every, RecurringMoment } = require('../utils/time');
const { camel, parseString } = require('../utils/string');
const { includeKeys } = require('../utils/structures');
const { Logger } = require('../log');

const libName = 'web-api';

const elementAttributes = [
  'get',
  'set',
  'setType',
  'label',
  'subLabel',
  'showSubLabel',
  'type',
  'subType',
  'unit'
];

function sortElements(rawInput = [], list = [], key = 'name') {
  const altKey = camel('sort', key);

  const input = rawInput.filter(Boolean);

  const unsorted = input.filter(({ [key]: name, [altKey]: altName }) => {
    return !(list.includes(name) || list.includes(altName));
  });

  const sorted = list.map((sortKey) => {
    return input.filter(({ [key]: name, [altKey]: altName }) => {
      return name === sortKey || altName === sortKey;
    });
  }).filter(Boolean);

  return [].concat(...sorted, unsorted);
}

function elementNames(elements, key = 'name') {
  const result = new Set();

  elements.forEach(({
    attributes: { [key]: value = null } = {}
  }) => {
    result.add(value);
  });

  return [...result].sort();
}

function elementsInHierarchy(elements, value, key = 'name') {
  return elements.filter(({
    attributes: { [key]: is = null } = {}
  }) => {
    return is === value;
  });
}

function combineAttributes(elements) {
  return Object.assign(
    {},
    ...elements.map((element) => {
      const { attributes = {} } = element;
      return attributes;
    })
  );
}

function showSubLabel(elements) {
  const labels = new Set();
  const doubled = new Set();

  elements.forEach((element) => {
    const {
      attributes: {
        label = null
      } = {}
    } = element;

    if (!label) return;

    if (labels.has(label)) {
      doubled.add(label);
    }

    labels.add(label);
  });

  return elements.map((element) => {
    const {
      attributes,
      attributes: {
        label
      } = {}
    } = element;

    if (doubled.has(label)) {
      attributes.showSubLabel = true;
    }

    return element;
  });
}

function filterElementAttributes(input) {
  return Object.assign(
    {},
    input,
    {
      attributes: includeKeys(input.attributes, ...elementAttributes)
    }
  );
}

function getHierarchy(
  elements = [],
  {
    sections,
    categories,
    labels: rawLabels
  } = {}
) {
  const labels = [null, ...rawLabels];

  const sectionMap = sections.map((sectionGroup) => {
    return sortElements(sectionGroup.map((sectionName) => {
      const sectionElements = elementsInHierarchy(elements, sectionName, 'section');

      if (!sectionElements.length) return null;

      const categoryMap = sortElements(elementNames(sectionElements, 'category').map((categoryName) => {
        const categoryElements = showSubLabel(
          elementsInHierarchy(sectionElements, categoryName, 'category')
        );

        if (!categoryElements.length) return null;

        const groupMap = sortElements([].concat(...elementNames(categoryElements, 'group').map((groupName) => {
          const groupElements = elementsInHierarchy(categoryElements, groupName, 'group');

          if (!groupElements.length) return null;

          if (groupName === null) {
            return groupElements.map((groupElement) => {
              const {
                attributes: {
                  label = null,
                  sortLabel = null
                }
              } = groupElement;

              return {
                group: label,
                sortGroup: sortLabel,
                single: true,
                elements: [filterElementAttributes(groupElement)]
              };
            });
          }

          const isSingle = groupElements.length <= 1;
          const { sortGroup } = combineAttributes(groupElements);

          return [{
            group: groupName,
            sortGroup,
            single: isSingle,
            elements: groupElements.map(filterElementAttributes)
          }];
        })), labels, 'group');

        const { sortCategory } = combineAttributes(categoryElements);

        return {
          category: categoryName,
          sortCategory,
          groups: groupMap
        };
      }), categories, 'category');

      return {
        section: sectionName,
        categories: categoryMap
      };
    }), sectionGroup, 'section');
  });

  return {
    sections: sectionMap
  };
}

class WebApi {
  constructor(options = {}) {
    const {
      host = undefined,
      port = null,
      hmiServer = null,
      scheduler = null,
      update = null,
      meta = {}
    } = options;

    if (!port || !hmiServer || !scheduler || !update) {
      throw new Error('insufficient options provided');
    }

    this._webApi = {
      isActive: false,
      clients: {},
      meta
    };

    rebind(
      this,
      '_handleIngest',
      '_handleStream',
      '_handleList',
      '_handleValues',
      '_handleSet'
    );

    this._setUpHttpServer(host, port);
    this._setUpHmiService(hmiServer, scheduler, update);

    const log = new Logger();
    log.friendlyName(`WebApi (${host}:${port})`);
    this._webApi.log = log.withPrefix(libName);
  }

  _setUpHttpServer(host, port) {
    const httpServer = new HttpServer({
      host,
      port,
      handler: HttpServer.do404,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    httpServer.route('/stream', this._handleStream);
    httpServer.route('/list', this._handleList);
    httpServer.route('/values', this._handleValues);
    httpServer.route('/set', this._handleSet);
    this._webApi.httpServer = httpServer;
  }

  _setUpHmiService(hmiServer, scheduler, update) {
    const hmiService = hmiServer.addService(this._handleIngest);
    new RecurringMoment(
      scheduler,
      every.second(update)
    ).on('hit', () => {
      if (
        this._webApi.isActive
        && Object.keys(this._webApi.clients).length
      ) {
        hmiService.getAll();
      }
    });
    this._webApi.hmiService = hmiService;
  }

  _sendToStream(input) {
    const {
      log,
      clients
    } = this._webApi;

    Object.values(clients).forEach((write) => {
      try {
        write(input);
      } catch (error) {
        log.error('failed writing stream to client');
      }
    });
  }

  _publishMessage(input) {
    const data = JSON.stringify(input, null, null);
    const payload = `data: ${data}\n\n`;

    this._sendToStream(payload);
  }

  _handleIngest(options) {
    const {
      name,
      attributes,
      value
    } = options;

    this._publishMessage({
      name,
      attributes,
      value
    });
  }

  _handleStream(request, response) {
    const { log, clients } = this._webApi;
    const { connection: { remoteAddress, remotePort } } = request;
    const { write } = response;

    log.info(`add stream from client "${remoteAddress}:${remotePort}"`);

    const name = `webApi/${remoteAddress}:${remotePort}`;

    this._publishMessage({
      isSystem: true,
      event: 'newClient',
      id: name,
      count: Object.keys(clients).length + 1
    });

    clients[name] = write;
    request.on('close', () => {
      log.info(`delete stream from client "${remoteAddress}:${remotePort}"`);
      delete clients[name];

      this._publishMessage({
        isSystem: true,
        event: 'delClient',
        id: name,
        count: Object.keys(clients).length
      });
    });

    return {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8'
      },
      openEnd: true,
      handler: Promise.resolve(
        `: welcome to the event stream\n: client "${name}"\n\n`
      )
    };
  }

  _handleList(request) {
    const {
      hmiService,
      meta: {
        sort = {},
        strings = {}
      }
    } = this._webApi;
    const { urlQuery: { values = false } } = request;

    return {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      handler: hmiService.list(
        Boolean(parseString(values))
      ).then((elements) => {
        return JSON.stringify({
          strings,
          hierarchy: getHierarchy(elements, sort)
        }, null, null);
      })
    };
  }

  _handleValues() {
    const { hmiService } = this._webApi;

    return {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      handler: hmiService.list(true).then((response = []) => {
        const elements = response.map(
          ({ name, value }) => {
            return { name, value };
          }
        );
        return JSON.stringify(elements, null, null);
      })
    };
  }

  _handleSet(request) {
    const { log, hmiService } = this._webApi;
    const {
      connection: {
        remoteAddress,
        remotePort
      },
      urlQuery
    } = request;

    log.info(`setting from client "${remoteAddress}:${remotePort}"`);

    const setters = Object.keys(urlQuery).map((key) => {
      const { [key]: input } = urlQuery;
      const value = parseString(input) || false;

      return resolveAlways(hmiService.set(key, value));
    });

    return {
      handler: Promise.all(setters),
      resolveCode: 204
    };
  }

  start() {
    if (!this._webApi.isActive) {
      this._webApi.isActive = true;
      this._webApi.httpServer.listen();
    }
  }

  stop() {
    if (this._webApi.isActive) {
      this._webApi.isActive = false;
      this._webApi.httpServer.close();
    }
  }
}

module.exports = {
  WebApi
};
