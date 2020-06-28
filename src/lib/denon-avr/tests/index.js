/* eslint-disable no-console */
import { DenonAvr } from '../index.js';

// SOCKET TEST
const avr = new DenonAvr({
  host: 'bender.net.wurstsalat.cloud'
});

avr.on('disconnect', () => {
  console.log('disconnected');
});

avr.on('event', (data) => {
  console.log(data);
});

avr.on('connect', async () => {
  console.log('connected');

  try {
    console.log(`power: ${await avr.request('PW', '?')}`);
    console.log(`volume: ${await avr.request('MV', '?')}`);
  } catch (error) {
    console.error('error', error);
  }
});

avr.connect();
