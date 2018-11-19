const { post } = require('../http/client');
const { Logger } = require('../log');

const libName = 'telegram';

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

    const log = new Logger();
    log.friendlyName(chatId);
    this._log = log.withPrefix(libName);
  }

  send(message) {
    const { _chatId } = this;

    return post(
      makeUrl('sendMessage'),
      Buffer.from(JSON.stringify(Object.assign(telegramMessageOptions, {
        chat_id: _chatId,
        text: message
      })), 'utf8'),
      telegramHttpOptions
    ).then((response) => {
      const { ok, result } = JSON.parse(response);

      if (!ok) {
        throw new Error(JSON.stringify(result));
      }

      return result;
    }).catch((error) => {
      this._log.error({
        head: 'error sending telegram message',
        attachment: null || (error && error.message)
      });
    });
  }

  delete(id) {
    const { _chatId } = this;

    return post(
      makeUrl('deleteMessage'),
      Buffer.from(JSON.stringify(Object.assign(telegramMessageOptions, {
        chat_id: _chatId,
        message_id: id
      })), 'utf8'),
      telegramHttpOptions
    ).then((response) => {
      const { ok, result } = JSON.parse(response);

      if (!ok) {
        throw new Error(JSON.stringify(result));
      }

      return result;
    }).catch((error) => {
      this._log.error({
        head: 'error deleting telegram message',
        attachment: null || (error && error.message)
      });
    });
  }
}

module.exports = {
  chatIds: telegramChatIds,
  TelegramChat
};
