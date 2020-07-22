import { RecurringMoment, every } from '../utils/time.js';
import { camel, parseString } from '../utils/string.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { HttpServer } from '../http/server.js';
import { Logger } from '../log/index.js';
import { includeKeys } from '../utils/structures.js';

const libName = 'web-api';

const elementAttributes = [
  'get',
  'isExtension',
  'label',
  'set',
  'setType',
  'subLabel',
  'subType',
  'unit',
];

function getExtensions(extensions) {
  return Object.keys(extensions).map((name) => {
    const { [name]: attributes = {} } = extensions;

    return {
      attributes: Object.assign(
        {
          isExtension: true,
        },
        attributes
      ),
      name,
    };
  });
}

function sortElements(rawInput = [], list = [], key = 'name') {
  const altKey = camel('sort', key);

  const input = rawInput.filter(Boolean);

  const unsorted = input.filter(({ [key]: name, [altKey]: altName }) => {
    if (altName !== undefined) {
      return !list.includes(altName);
    }

    return !list.includes(name);
  });

  const sorted = list
    .map((sortKey) => {
      return input.filter(({ [key]: name, [altKey]: altName }) => {
        if (altName !== undefined) {
          return altName === sortKey;
        }

        return name === sortKey;
      });
    })
    .filter(Boolean);

  return [].concat(...sorted, unsorted);
}

function elementNames(elements, key = 'name') {
  const result = new Set();

  elements.forEach(
    ({
      attributes: {
        [key]: value = null,
      } = /** @type {{ [key: string]: any }} */ ({}),
    }) => {
      result.add(value);
    }
  );

  return [...result].sort();
}

function elementsInHierarchy(elements, value, key = 'name') {
  return elements.filter(
    ({
      attributes: {
        [key]: is = null,
      } = /** @type {{ [key: string]: any }} */ ({}),
    }) => {
      return (
        is === value ||
        ((value === undefined || value === null) &&
          (is === undefined || is === null))
      );
    }
  );
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

function findShowSubGroup(elements) {
  const groups = new Set();
  const doubled = new Set();

  elements.forEach((element) => {
    const {
      attributes: { group: primary = null, groupLabel: secondary = null } = {},
    } = element;

    const group = secondary || primary;

    if (!group) return;

    if (groups.has(group)) {
      doubled.add(group);
    }

    groups.add(group);
  });

  return elements.map((element) => {
    const {
      attributes,
      attributes: { group: primary = null, groupLabel: secondary = null } = {},
    } = element;

    const group = secondary || primary;

    if (doubled.has(group)) {
      attributes.showSubGroup = true;
    }

    return element;
  });
}

function filterElementAttributes(input) {
  return Object.assign({}, input, {
    attributes: includeKeys(input.attributes, ...elementAttributes),
  });
}

function getHierarchy(
  elements = [],
  { sections = [], categories = [], groups = [] } = {}
) {
  const sectionMap = sections.map((sectionGroup) => {
    return sortElements(
      sectionGroup.map((sectionName) => {
        const sectionElements = elementsInHierarchy(
          elements,
          sectionName,
          'section'
        );

        if (!sectionElements.length) return null;

        const categoryMap = sortElements(
          elementNames(sectionElements, 'category').map((categoryName) => {
            const categoryElements = findShowSubGroup(
              elementsInHierarchy(sectionElements, categoryName, 'category')
            );

            if (!categoryElements.length) return null;

            const groupMap = sortElements(
              [].concat(
                ...elementNames(categoryElements, 'group').map((groupName) => {
                  const groupElements = elementsInHierarchy(
                    categoryElements,
                    groupName,
                    'group'
                  );

                  if (!groupElements.length) return null;

                  const isSingle = groupElements.length === 1;
                  const {
                    groupLabel,
                    showSubGroup,
                    sortGroup,
                    subGroup,
                    type,
                  } = combineAttributes(groupElements);

                  return [
                    {
                      elements: groupElements.map(filterElementAttributes),
                      group: groupName,
                      groupLabel,
                      showSubGroup,
                      single: isSingle,
                      sortGroup,
                      subGroup,
                      type,
                    },
                  ];
                })
              ),
              groups,
              'group'
            );

            const { sortCategory } = combineAttributes(categoryElements);

            return {
              category: categoryName,
              groups: groupMap,
              sortCategory,
            };
          }),
          categories,
          'category'
        );

        return {
          categories: categoryMap,
          section: sectionName,
        };
      }),
      sectionGroup,
      'section'
    );
  });

  return {
    sections: sectionMap,
  };
}

export class WebApi {
  constructor(options = {}) {
    const {
      host = undefined,
      port = null,
      hmiServer = null,
      scheduler = null,
      update = null,
      meta = {},
    } = options;

    if (!port || !hmiServer || !scheduler || !update) {
      throw new Error('insufficient options provided');
    }

    this._webApi = {
      clients: {},
      isActive: false,
      list: null,
      meta,
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
      handler: HttpServer.do404,
      headers: {
        'Cache-Control': 'no-cache',
      },
      host,
      port,
    });
    httpServer.route('/stream', this._handleStream);
    httpServer.route('/list', this._handleList);
    httpServer.route('/values', this._handleValues);
    httpServer.route('/set', this._handleSet);
    this._webApi.httpServer = httpServer;
  }

  _setUpHmiService(hmiServer, scheduler, update) {
    const hmiService = hmiServer.addService(this._handleIngest);
    new RecurringMoment({ scheduler }, every.parse(update)).on('hit', () => {
      if (this._webApi.isActive && Object.keys(this._webApi.clients).length) {
        hmiService.getAll();
      }
    });
    this._webApi.hmiService = hmiService;
  }

  _sendToStream(input) {
    const { log, clients } = this._webApi;

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

  _updateList() {
    const {
      hmiService,
      meta: { extensions = {}, sort = {}, strings = {} },
    } = this._webApi;

    hmiService
      .list()
      .then((elements) => {
        return JSON.stringify(
          {
            hierarchy: getHierarchy(
              [].concat(elements, getExtensions(extensions)),
              sort
            ),
            strings,
          },
          null,
          null
        );
      })
      .catch()
      .then((result) => {
        if (!result) return;

        this._webApi.list = result;
      });
  }

  _handleIngest(options) {
    const { name, attributes, value, type } = options;

    switch (type) {
      case 'stream':
        this._publishMessage({
          attributes,
          name,
          value,
        });
        break;
      case 'element':
        this._updateList();
        break;
      default:
    }
  }

  _handleStream(request, response) {
    const { log, clients } = this._webApi;
    const {
      connection: { remoteAddress, remotePort },
    } = request;
    const { write } = response;

    log.info(`add stream from client "${remoteAddress}:${remotePort}"`);

    const name = `webApi/${remoteAddress}:${remotePort}`;

    this._publishMessage({
      count: Object.keys(clients).length + 1,
      event: 'newClient',
      id: name,
      isSystem: true,
    });

    clients[name] = write;
    request.on('close', () => {
      log.info(`delete stream from client "${remoteAddress}:${remotePort}"`);
      delete clients[name];

      this._publishMessage({
        count: Object.keys(clients).length,
        event: 'delClient',
        id: name,
        isSystem: true,
      });
    });

    return {
      handler: Promise.resolve(
        `: welcome to the event stream\n: client "${name}"\n\n`
      ),
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
      },
      openEnd: true,
    };
  }

  _handleList(request) {
    const {
      hmiService,
      list,
      meta: { extensions = {}, sort = {}, strings = {} },
    } = this._webApi;
    const {
      urlQuery: { values = false },
    } = request;

    const getValues = Boolean(parseString(values));

    return {
      handler: getValues
        ? hmiService.list(true).then((elements) => {
            return JSON.stringify(
              {
                hierarchy: getHierarchy(
                  [].concat(elements, getExtensions(extensions)),
                  sort
                ),
                strings,
              },
              null,
              null
            );
          })
        : Promise.resolve(list),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
  }

  _handleValues() {
    const { hmiService } = this._webApi;

    return {
      handler: hmiService.list(true).then((response = []) => {
        const elements = response.map(({ name, value }) => {
          return { name, value };
        });
        return JSON.stringify(elements, null, null);
      }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    };
  }

  _handleSet(request) {
    const { log, hmiService } = this._webApi;
    const {
      connection: { remoteAddress, remotePort },
      urlQuery,
    } = request;

    log.info(`setting from client "${remoteAddress}:${remotePort}"`);

    const setters = Object.keys(urlQuery).map((key) => {
      const { [key]: input } = urlQuery;
      const value = parseString(input) || false;

      return resolveAlways(hmiService.set(key, value));
    });

    return {
      handler: Promise.all(setters),
      resolveCode: 204,
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
