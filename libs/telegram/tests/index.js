/* eslint-disable no-console */
const { createTelegramClient, createInlineKeyboad, chatIds } = require('../index');
const { Scheduler } = require('../../utils/time');

(async () => {
  const client = await createTelegramClient(new Scheduler());
  client.start();

  const chat = await client.addChat(chatIds.iot);

  await chat.addMessage({
    text: 'Test',
    inlineKeyboard: createInlineKeyboad([
      [
        {
          text: 'dismiss',
          callback: (_, message) => {
            console.log(message);
            message.delete();

            return 'deleted!';
          }
        }
      ]
    ])
  });
})();
