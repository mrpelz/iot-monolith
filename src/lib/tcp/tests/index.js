/* eslint-disable no-console */
import { PersistentSocket, ReliableSocket } from '../index.js';

// PERSISTENT SOCKET TEST
const persistentSocket = new PersistentSocket({
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

let writeInterval1;

persistentSocket.on('data', (input) => {
  console.log(input);
});

persistentSocket.on('connect', () => {
  console.log('connected');

  writeInterval1 = setInterval(() => {
    persistentSocket.write(Buffer.from('test'));
  }, 1000);
});

persistentSocket.on('disconnect', () => {
  console.log('disconnected');

  clearInterval(writeInterval1);
});

persistentSocket.connect();

setTimeout(() => {
  persistentSocket.disconnect();
}, 10000);


// RELIABLE SOCKET TEST
const reliableSocket = new ReliableSocket({
  host: '127.0.0.1',
  port: 3000
});

let writeInterval2;

reliableSocket.on('data', (input) => {
  console.log(input);
});

reliableSocket.on('connect', () => {
  console.log('connected');

  writeInterval2 = setInterval(() => {
    reliableSocket.write(Buffer.from('test'));
  }, 1000);
});

reliableSocket.on('disconnect', () => {
  console.log('disconnected');

  clearInterval(writeInterval2);
});

reliableSocket.connect();

setTimeout(() => {
  reliableSocket.disconnect();
}, 60000);
