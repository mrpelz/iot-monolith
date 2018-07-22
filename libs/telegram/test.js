/* eslint-disable no-console */
const { chatIds, TelegramChat } = require('./index');

const message = 'testMessage';
const telegramChat = new TelegramChat(chatIds.log);

telegramChat.send(message).catch((reason) => {
  console.error(reason);
});
