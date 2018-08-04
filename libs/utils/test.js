/* eslint-disable no-console */
const { sleep } = require('./time');

(async function test() {
  console.log(await sleep(3000, 'test'));
}());
