// const { createServer } = require('http');
// const { rebind } = require('../utils/oop');
// const { Logger } = require('../log');

// const logPrefix = 'obi-jack';
// const { log } = new Logger(logPrefix);

// class Prometheus {
//   constructor(options) {
//     const {
//       port
//     } = options;

//     if (!port) {
//       throw new Error('insufficient options provided');
//     }

//     rebind(this, '_handleRequest');
//     this.on('connect', this._handlePrometheusConnection);
//   }
// }

// module.exports = {
//   Prometheus
// };
