/* eslint-disable no-console */
const { get, post } = require('./index');

// GET TEST (HTTP)
get('http://httpbin.org/get?this=is&a=test#hash').then((value) => {
  console.log(value.toString());
}, (error) => {
  console.error(error);
});

// GET TEST (HTTPS)
get('https://www.google.com').then(() => {
  console.log('HTTPS-test done!');
}, (error) => {
  console.error(error);
});

// POST TEST (HTTP)
post('http://httpbin.org/post', Buffer.from([0x00, 0x00, 0x00, 0x00])).then((value) => {
  console.log(value.toString());
}, (error) => {
  console.error(error);
});
