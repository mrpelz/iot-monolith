/* eslint-disable no-console */
const { StateFile } = require('../index');

const testFileName = 'penis';

(async function test() {
  try {
    console.log(await new StateFile(testFileName).get());

    await new StateFile(testFileName).set({
      testKey: false
    });

    console.log(await new StateFile(testFileName).get());
  } catch (error) {
    console.error(error);
  }
}());
