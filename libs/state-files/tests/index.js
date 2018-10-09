/* eslint-disable no-console */
const { StateFile } = require('../index');

const testFileName = 'penis';

(async function test() {
  const stateA = new StateFile(testFileName);
  const stateB = new StateFile(testFileName);

  try {
    await stateA.set({
      testKey: false
    });

    const { testKey = null } = await stateB.get();
    console.log({
      testKey
    });
  } catch (error) {
    console.error(error);
  }
}());
