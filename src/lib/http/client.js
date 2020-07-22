import { rebind, resolveAlways } from '../utils/oop.js';
import { EventEmitter } from 'events';
import { URL } from 'url';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';

export function httpClient(method, url = {}, options = {}, data) {
  const {
    auth,
    hostname,
    pathname = '/',
    port: specifiedPort,
    protocol,
    search,
  } = typeof url === 'string' ? new URL(url) : url;

  if (!hostname) {
    throw new Error('unknown host in url');
  }

  let request;
  let port;

  switch (protocol) {
    case 'http:':
      request = httpRequest;
      port = specifiedPort ? Number.parseInt(specifiedPort, 10) : 80;
      break;
    case 'https:':
      request = httpsRequest;
      port = specifiedPort ? Number.parseInt(specifiedPort, 10) : 443;
      break;
    default:
      throw new Error('unknown protocol in url');
  }

  const defaultHeaders = {
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': `node ${process.version}`,
  };

  const { headers: additionalHeaders = {} } = options;

  const mergedOptions = Object.assign(
    {
      auth,
      hostname,
      method,
      path: `${pathname}${search}`,
      port,
      protocol,
    },
    options,
    {
      headers: Object.assign(defaultHeaders, additionalHeaders),
    }
  );

  return new Promise((resolve, reject) => {
    const req = request(mergedOptions);

    req.on('response', (res) => {
      const cache = [];

      res.on('data', (chunk) => {
        cache.push(chunk);
      });

      res.on('end', () => {
        const result = Buffer.concat(cache);

        if (res.statusCode < 200 || res.statusCode > 299) {
          reject(
            new Error(
              `failed to load page, status code: ${
                res.statusCode
              }, content: ${result.toString()}`
            )
          );
        } else {
          resolve(result);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

export function get(url, options) {
  return httpClient('GET', url, options);
}

export function post(url, data, options) {
  return httpClient('POST', url, options, data);
}

export class LongPollClient extends EventEmitter {
  constructor(scheduler, caller) {
    if (!scheduler || !caller) {
      throw new Error('insufficient options provided!');
    }

    super();

    this._scheduler = scheduler;
    this._caller = caller;
    this._active = false;

    rebind(this, '_poll');
  }

  _poll() {
    if (this._active) return;
    this._active = true;

    (async () => {
      const payload = await resolveAlways(this._caller());

      if (payload) {
        this.emit('message', payload);
      }

      this._active = false;
    })();
  }

  start() {
    this._scheduler.on('tick', this._poll);
  }

  stop() {
    this._scheduler.removeListener('tick', this._poll);
  }
}
