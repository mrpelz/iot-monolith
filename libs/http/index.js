const { httpClient } = require('./client');

function get(url, options) {
  return httpClient('GET', url, options);
}

function post(url, data, options) {
  return httpClient('POST', url, options, data);
}

module.exports = {
  get,
  post
};
