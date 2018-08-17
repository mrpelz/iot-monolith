/* eslint-disable no-console */
const { StateFile } = require('../index');

(async function test() {
  const stateA = new StateFile('test-file');
  const stateB = new StateFile('test-file');

  try {
    await stateA.set({
      test: 'data'
    });

    const data = await stateB.get();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}());
