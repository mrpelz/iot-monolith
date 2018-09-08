/* eslint-disable no-console */
const { cache, cacheAll } = require('../index');

class SyncTest {
  constructor(arg) {
    this.arg = arg;
  }

  method1() {
    console.log('method1 is called');
    return this.arg;
  }

  method2() {
    console.log('method2 is called');
    return this.arg;
  }
}

class AsyncTest {
  constructor(arg) {
    this.arg = arg;
  }

  method1() {
    console.log('method1 is called');
    return Promise.resolve(this.arg);
  }

  method2() {
    console.log('method2 is called');
    return Promise.resolve(this.arg);
  }
}

(function syncTest() {
  const wired = cache(new SyncTest('synchronous döner'), {
    method1: 2000
  });

  console.log('sync test start');
  console.log(wired.method1());
  console.log(wired.method1());
  console.log(wired.method2());
  console.log(wired.method2());
  console.log(wired.arg);
  console.log('sync test end \n');
}());

(async function asyncTest() {
  const wired = cacheAll(new AsyncTest('asynchronous döööner'), 2000);

  console.log('async test start');
  console.log(await wired.method1());
  console.log(await wired.method1());
  console.log(await wired.method2());
  console.log(await wired.method2());
  console.log(wired.arg);
  console.log('async test end \n');
}());
