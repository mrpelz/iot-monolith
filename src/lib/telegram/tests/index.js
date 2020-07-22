/* eslint-disable no-console */
import { createInlineKeyboard, createTelegramClient } from '../index.js';

import { Scheduler } from '../../utils/time.js';

const host = 'api.telegram.org';
const token = 'SECRET'; // Test-Bot
const chatId = -288897571; // IoT-Group

(async () => {
  const client = await createTelegramClient(new Scheduler(), token, host);
  client.start();

  const chat = await client.addChat(chatId);

  const respond = (button, message) => {
    message.delete();
    chat.addMessage({
      text: `you chose "${button.text}"`,
    });
  };

  await chat.addMessage({
    inlineKeyboard: createInlineKeyboard([
      [
        {
          callback: respond,
          text: 'Very much',
        },
        {
          callback: respond,
          text: 'Very, very much',
        },
      ],
      [
        {
          callback: respond,
          text: 'So much it hurts. 😏',
        },
        {
          callback: respond,
          text: 'Not.',
        },
      ],
    ]),
    text: 'Hallo @tsiatt! How much do you love @mrpelz',
  });
})();
