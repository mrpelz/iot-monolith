const { Ev1527Server } = require('../../libs/ev1527');

const {
  config: {
    globals: {
      ev1527: {
        host,
        port
      }
    }
  }
} = global;

const ev1527Server = new Ev1527Server({
  host,
  port
});
ev1527Server.connect();

global.ev1527Server = ev1527Server;
