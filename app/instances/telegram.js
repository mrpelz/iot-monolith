const { createTelegramClient } = require('../../libs/telegram');
const { getKey } = require('../../libs/utils/structures');

const {
  config: {
    telegram: {
      host,
      token,
      chatIds
    }
  },
  db,
  scheduler
} = global;

try {
  const telegramDb = getKey(db, 'telegram');
  const client = createTelegramClient(scheduler, token, host, telegramDb);

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
