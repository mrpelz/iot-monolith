const { request: httpRequest } = require('http');
const { request: httpsRequest } = require('https');
const { URL } = require('url');

function httpClient(method, url = {}, options = {}, data) {
  const {
    auth,
    host,
    pathname = '/',
    protocol,
    search
  } = (typeof url === 'string') ? new URL(url) : url;

  if (!host) {
    throw new Error('unknown host in url');
  }

  let request;

  switch (protocol) {
    case 'http:':
      request = httpRequest;
      break;
    case 'https:':
      request = httpsRequest;
      break;
    default:
      throw new Error('unknown protocol in url');
  }

  const defaultHeaders = {
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': `node ${process.version}`
  };

  const { headers: additionalHeaders = {} } = options;

  const mergedOptions = Object.assign({
    auth,
    host,
    method,
    path: `${pathname}${search}`,
    protocol
  }, options, {
    headers: Object.assign(defaultHeaders, additionalHeaders),
  });

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
          reject(new Error(
            `failed to load page, status code: ${res.statusCode}, content: ${result.toString()}`
          ));
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

module.exports = {
  httpClient
};
