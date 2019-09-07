/* eslint-disable no-console */
const { MessageClient } = require('../index');
const { emptyBuffer } = require('../../utils/data');

// MESSAGE TEST
const client = new MessageClient({
  host: '127.0.0.1',
  port: 3001,
  messageTypes: [
    {
      name: 'test1',
      head: Buffer.from([0x01]),
      generator: (x) => { return Buffer.from(x); },
      timeout: 60000
    },
    {
      name: 'test2',
      head: Buffer.from([0x02]),
      tail: emptyBuffer,
      parser: (x) => { return x; },
      generator: (x) => { return Buffer.from(x); },
      timeout: 2000,
      eventName: 'test2'
    }
  ]
});

client.on('data', (input) => {
  console.log(input);
});

client.on('connect', () => {
  console.log('connected');

  client.request('test1', 'test1').then((value) => {
    console.log(value);
  }, (error) => {
    console.error(error);
  });

  client.request('test2', 'test2').then((value) => {
    console.log(value);
  }, (error) => {
    console.error(error);
  });
});

client.on('disconnect', () => {
  console.log('disconnected');
});

client.connect();