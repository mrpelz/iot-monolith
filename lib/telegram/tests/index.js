/* eslint-disable no-console */
const { createTelegramClient, createInlineKeyboard } = require('../index');
const { Scheduler } = require('../../utils/time');

const host = 'api.telegram.org';
const token = '758262306:AAHCPl1Vg5nJIrh_LKVFHU5VOydFsD-Dl88'; // Test-Bot
const chatId = -288897571; // IoT-Group

(async () => {
  const client = await createTelegramClient(new Scheduler(), token, host);
  client.start();

  const chat = await client.addChat(chatId);

  const respond = (button, message) => {
    message.delete();
    chat.addMessage({
      text: `you chose "${button.text}"`
    });
  };

  await chat.addMessage({
    text: 'Hallo @tsiatt! How much do you love @mrpelz',
    inlineKeyboard: createInlineKeyboard([
      [
        {
          text: 'Very much',
          callback: respond
        },
        {
          text: 'Very, very much',
          callback: respond
        }
      ],
      [
        {
          text: 'So much it hurts. 😏',
          callback: respond
        },
        {
          text: 'speediest96553549\'syllogistical',
          callback: respond
        }
      ]
    ])
  });
})();
