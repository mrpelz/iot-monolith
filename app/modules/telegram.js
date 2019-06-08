const { createTelegramClient } = require('../../lib/telegram');
const { getKey } = require('../../lib/utils/structures');

function create(config, data) {
  const {
    telegram: {
      host,
      token,
      chatIds
    }
  } = config;

  const {
    db,
    scheduler
  } = data;

  try {
    const telegramDb = getKey(db, 'telegram');
    const client = createTelegramClient(scheduler, token, host, telegramDb);

    client.then((instance) => {
      instance.start();
    });

    Object.assign(data, {
      telegram: {
        client,
        chatIds
      }
    });
  } catch (error) {
    throw new Error('could not create telegram instance');
  }
}

module.exports = {
  create
};
