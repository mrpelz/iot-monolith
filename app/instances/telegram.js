const { createTelegramClient } = require('../../libs/telegram');

const {
  config: {
    telegram: {
      host,
      token,
      chatIds
    }
  },
  scheduler
} = global;

try {
  const client = createTelegramClient(scheduler, token, host);

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
