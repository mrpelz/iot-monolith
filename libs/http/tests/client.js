/* eslint-disable no-console */
const { get, post } = require('../index');

(async function clientTest() {
  try {
    // GET TEST (HTTP)
    const test1 = await get('http://httpbin.org/get?this=is&a=test#hash');

    // GET TEST (HTTPS)
    await get('https://www.google.com');

    // POST TEST (HTTP)
    const test3 = await post('http://httpbin.org/post', Buffer.from([0x00, 0x00, 0x00, 0x00]));

    console.log(test1.toString(), test3.toString());
  } catch (error) {
    console.error(error);
  }
}());
