const { createTelegramClient, chatIds } = require('../../libs/telegram');

const {
  scheduler
} = global;

try {
  const client = createTelegramClient(scheduler);

  client.then((instance) => {
    instance.start();
  });

  global.telegram = {
    client,
    chatIds
  };
} catch (error) {
  throw new Error('could not create telegram instance');
}
