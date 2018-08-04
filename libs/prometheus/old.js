/* eslint-disable no-bitwise */
/* eslint strict:0 */

'use strict';

const http = require('http');
const { client } = require('iot-rpc');

const { setProperty } = client();

const {
  httpPort,
  valueMaxAge,
  parentScope,
  metricPrefix
} = require('./config.json');

const { config } = process.env;
if (!config) {
  process.exit(1);
}

const { metrics } = JSON.parse(config);

const getters = [];

function makeScope(...input) {
  return input.join('.');
}

function makeLabelString(labels) {
  if (!labels) {
    return '';
  }

  const keys = Object.keys(labels);

  return keys.map((key) => {
    const value = labels[key];

    return (
      value ?
        `${key}="${value}"` :
        false
    );
  }).filter((x) => { return x; }).join(',');
}

// http://www.jstips.co/en/javascript/array-average-and-median/
function median(...numbers) {
  numbers.sort((a, b) => { return a - b; });
  return (numbers[(numbers.length - 1) >> 1] + numbers[numbers.length >> 1]) / 2;
}

function drawMetric(metric, suffix, labelString, value) {
  return `${metricPrefix}${metric}${suffix}{${labelString}} ${value}`;
}

function trimDecimals(input) {
  return (Math.round(input * 1000) / 1000);
}

function makeSetter(cache) {
  return (value, callback) => {
    const time = Date.now();

    cache.unshift({
      time,
      value
    });

    callback(null, true);
  };
}

function makeGetter(cache, metric, labels, single) {
  const labelString = makeLabelString(labels);

  return () => {
    const cutoff = Date.now() - valueMaxAge;

    const newCache = cache.filter((x) => {
      return (x.time > cutoff);
    });

    cache.length = 0;
    cache.unshift(...newCache);

    const values = cache.map((x) => {
      return x.value;
    });
    const count = values.length;

    if (single) {
      return `${drawMetric(metric, '_now', labelString, !count ? 'nan' : trimDecimals(values[0]))}\n`;
    }

    const output = [
      drawMetric(metric, '_med', labelString, !count ? 'nan' : trimDecimals(median(...values))),
      drawMetric(metric, '_min', labelString, !count ? 'nan' : trimDecimals(Math.min(...values))),
      drawMetric(metric, '_max', labelString, !count ? 'nan' : trimDecimals(Math.max(...values))),
      drawMetric(metric, '_now', labelString, !count ? 'nan' : trimDecimals(values[0])),
      drawMetric(metric, '_value_count', labelString, values.length)
    ];

    return `${output.join('\n')}\n`;
  };
}

function setUpProps() {
  metrics.forEach((x) => {
    const {
      id, metric, labels, single
    } = x;
    const { aggregate } = labels;

    const cache = [];

    const scope = (
      aggregate ?
        makeScope(parentScope, 'aggregate', id) :
        makeScope(parentScope, id)
    );

    setProperty(
      scope,
      { set: makeSetter(cache) }
    );

    getters.push(makeGetter(cache, metric, labels, single));
  });
}

function readMetrics() {
  return getters.map((get) => {
    return get();
  }).join('\n');
}

http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end(readMetrics());
}).listen(httpPort);

setUpProps();
