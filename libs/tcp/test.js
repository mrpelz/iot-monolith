/* eslint-disable no-console */
const { PersistentSocket } = require('./index');

// SOCKET TEST
const socket = new PersistentSocket({
  host: '127.0.0.1',
  port: 3000,
  keepAlive: {
    send: true,
    receive: false,
    time: 5000,
    data: Buffer.from([0xff])
  },
  lengthPreamble: 2
});

let writeInterval;

socket.on('data', (input) => {
  console.log(input);
});

socket.on('connect', () => {
  console.log('connected');

  writeInterval = setInterval(() => {
    socket.write(Buffer.from('test'));
  }, 1000);
});

socket.on('disconnect', () => {
  console.log('disconnected');

  clearInterval(writeInterval);
});

socket.connect();

setTimeout(() => {
  socket.disconnect();
}, 10000);
