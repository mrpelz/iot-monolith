const { telegramSend } = require('./index.js');

const message = 'testMessage';
const cases = [
  'WARNING',
  'ERROR',
  'CRITICAL',
  'ALERT',
  'EMERG'
];

const testInterval = setInterval(() => {
  if (cases.length) {
    telegramSend(cases.shift(), message);
  } else {
    clearInterval(testInterval);
  }
}, 2000);
