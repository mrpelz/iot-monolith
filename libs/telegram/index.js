/* eslint-disable no-console */
/* eslint import/no-extraneous-dependencies: ["error", {"optionalDependencies": true}] */
const { request: httpsRequest } = require('https');

const {
  telegramApiHost,
  telegramBotToken,
  telegramChatIds
} = require('./config.json');

const telegramHttpOptions = {
  hostname: telegramApiHost,
  path: `/bot${telegramBotToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': `node${process.version}`
  }
};

const telegramMessageOptions = {
  parse_mode: 'Markdown',
  disable_web_page_preview: true
};

const chatIds = telegramChatIds;

function telegramRequest(text, chatId) {
  const request = httpsRequest(telegramHttpOptions, (response) => {
    if (response.statusCode !== 200) {
      console.log(`ERROR sending log to Telegram: Status-Code = ${response.statusCode}`);
    }
  });

  request.setTimeout(0);
  request.on('error', (error) => {
    console.log(`ERROR sending log to Telegram: ${error}`);
  });

  request.end(JSON.stringify(Object.assign(telegramMessageOptions, {
    chat_id: chatId,
    text
  })));
}

// class TelegramChat {
//   constructor(chatId) {
//     this._chatId = chatId;
//   }

//   send(message) {
//     return new Promise((resolve, reject) => {

//     });
//   }
// }

module.exports = {
  chatIds,
  // TelegramChat
};
