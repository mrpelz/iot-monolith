const { post } = require('../http/client');

const {
  telegramApiHost,
  telegramBotToken,
  telegramChatIds
} = require('./config.json');

const telegramHttpOptions = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};

const telegramMessageOptions = {
  parse_mode: 'Markdown',
  disable_web_page_preview: true
};

function makeUrl(method) {
  return `https://${telegramApiHost}/bot${telegramBotToken}/${method}`;
}

class TelegramChat {
  constructor(chatId) {
    if (!chatId) {
      throw new Error('chatId not defined!');
    }

    this._chatId = chatId;
  }

  send(message) {
    const { _chatId } = this;

    return post(
      makeUrl('sendMessage'),
      Buffer.from(JSON.stringify(Object.assign(telegramMessageOptions, {
        chat_id: _chatId,
        text: message
      }))),
      telegramHttpOptions
    );
  }
}

module.exports = {
  chatIds: telegramChatIds,
  TelegramChat
};
