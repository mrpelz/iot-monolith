/* eslint-disable no-console */
import { MessageClient } from '../index.js';

import { emptyBuffer } from '../../utils/data.js';

// MESSAGE TEST
const client = new MessageClient({
  host: '127.0.0.1',
  messageTypes: [
    {
      generator: (x) => {
        return Buffer.from(x);
      },
      head: Buffer.from([0x01]),
      name: 'test1',
      timeout: 60000,
    },
    {
      eventName: 'test2',
      generator: (x) => {
        return Buffer.from(x);
      },
      head: Buffer.from([0x02]),
      name: 'test2',
      parser: (x) => {
        return x;
      },
      tail: emptyBuffer,
      timeout: 2000,
    },
  ],
  port: 3001,
});

client.on('data', (input) => {
  console.log(input);
});

client.on('connect', () => {
  console.log('connected');

  client.request('test1', Buffer.from('test1')).then(
    (value) => {
      console.log(value);
    },
    (error) => {
      console.error(error);
    }
  );

  client.request('test2', Buffer.from('test2')).then(
    (value) => {
      console.log(value);
    },
    (error) => {
      console.error(error);
    }
  );
});

client.on('disconnect', () => {
  console.log('disconnected');
});

client.connect();
