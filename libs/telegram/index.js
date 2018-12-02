const { post, LongPollClient } = require('../http/client');
const { Logger } = require('../log');
const { rebind } = require('../utils/oop');
const { excludeKeys } = require('../utils/structures');

const libName = 'telegram';

const updateTimeoutSeconds = 60;
const supportedUpdateTypes = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  // 'inline_query',
  // 'chosen_inline_result',
  // 'callback_query',
  // 'shipping_query',
  // 'pre_checkout_query'
];
const editMethods = {
  text: 'editMessageText',
  caption: 'editMessageCaption',
  media: 'editMessageMedia',
  reply_markup: 'editMessageReplyMarkup'
};

const {
  apiHost,
  token: configToken,
  chatIds
} = require('./config.json');

const telegramHttpOptions = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};

function telegramRequest(host, token, method, payload) {
  return post(
    `https://${host}/bot${token}/${method}`,
    Buffer.from(JSON.stringify(payload), 'utf8'),
    telegramHttpOptions
  ).then((response) => {
    const { ok, result } = JSON.parse(response);

    if (!ok) {
      throw new Error(JSON.stringify(result));
    }

    return result;
  });
}

class Message {
  static createPayload(chat = {}, options = {}) {
    const {
      html,
      markdown,
      notification = true,
      pagePreviews = true,
      responseToId,
      text
    } = options;

    let parseMode;
    if (html) parseMode = 'HTML';
    else if (markdown) parseMode = 'Markdown';

    return {
      chat_id: chat.id,
      disable_notification: !notification,
      disable_web_page_preview: !pagePreviews,
      parse_mode: parseMode,
      reply_to_message_id: responseToId,
      text
    };
  }

  static createOutgoing(client, chat, options) {
    if (!client || !chat || !options) {
      throw new Error('insufficient options provided!');
    }

    return client.request('sendMessage', Message.createPayload(chat, options)).then((payload) => {
      if (!payload) throw new Error('error sending message');

      const {
        date,
        from: {
          id: fromId
        } = {},
        message_id: messageId,
        text
      } = payload;

      return new Message({
        chat,
        client,
        date,
        from: fromId,
        id: messageId,
        text
      });
    });
  }

  constructor(options) {
    const {
      chat,
      client,
      date,
      from,
      id,
      text
    } = options;

    if (!chat || !client || !id || !date) {
      throw new Error('insufficient options provided!');
    }

    this.date = new Date(date);
    this.editDate = null;
    this.from = from;
    this.id = id;
    this.mine = from === client.id;
    this.text = text;

    this._chat = chat;
    this._client = client;
    this._deleted = false;
  }

  internalEdit(editDate, newText) {
    this.editDate = new Date(editDate);
    this.text = newText;
  }

  edit(options = {}) {
    const editKeys = Object.keys(editMethods);
    const calls = editKeys.map((key) => {
      const { [key]: method } = editMethods;
      const { [key]: value } = options;

      if (!value) return Promise.resolve();

      return this._client.request(method, Object.assign({
        message_id: this.id,
        [key]: value
      }, excludeKeys(Message.createPayload(this._chat, options), ...editKeys)));
    });

    return Promise.all(calls).then((payload = {}) => {
      const {
        edit_date: editDate
      } = payload;
      this.editDate = new Date(editDate);

      return true;
    }).catch(() => {
      return false;
    });
  }

  delete() {
    return this._client.request('deleteMessage', {
      chat_id: this._chat.id,
      message_id: this.id
    }).then((result) => {
      this._deleted = true;

      return result;
    });
  }
}

class Chat {
  static create(client, chatId) {
    if (!client || !chatId) {
      throw new Error('insufficient options provided!');
    }

    return client.request('getChat', {
      chat_id: chatId
    }).then((payload) => {
      if (!payload) throw new Error('chat does not exist');

      const {
        id,
        title,
        type
      } = payload;

      return new Chat({
        client,
        id,
        title,
        type
      });
    });
  }

  constructor(options) {
    const {
      client,
      id,
      title,
      type
    } = options;

    if (!client || !id || !title || !type) {
      throw new Error('insufficient options provided!');
    }

    this.id = id;
    this.title = title;
    this.type = type;

    this._client = client;
    this._messages = new Map();
  }

  ingestMessage(type, payload = {}) {
    const {
      date,
      edit_date: editDate,
      from: {
        id: fromId
      } = {},
      message_id: messageId,
      text
    } = payload;

    if (text === undefined) return;

    switch (type) {
      case 'message':
      case 'channel_post':
        this._messages.set(messageId, new Message({
          chat: this,
          client: this._client,
          date,
          from: fromId,
          id: messageId,
          text
        }));
        break;
      case 'edited_message':
      case 'edited_channel_post':
        if (this._messages.has(messageId)) {
          this._messages.get(messageId).internalEdit(editDate, text);
        }
        break;
      default:
    }
  }

  addMessage(options) {
    return Message.createOutgoing(this._client, this, options).then((message) => {
      this._messages.set(message.id, message);

      return message;
    });
  }
}

class Client {
  static create(scheduler, token, host) {
    if (!scheduler || !token || !host) {
      throw new Error('insufficient options provided!');
    }

    return telegramRequest(host, token, 'getMe', {}).then((payload) => {
      if (!payload) throw new Error('bot credentials invalid');

      const {
        first_name: firstName,
        id,
        last_name: lastName,
        username
      } = payload;

      return new Client({
        firstName,
        host,
        id,
        lastName,
        scheduler,
        token,
        username
      });
    });
  }

  constructor(options) {
    const {
      firstName,
      host,
      id,
      lastName,
      scheduler,
      token,
      username
    } = options;

    if (!id || !token || !scheduler || !host) {
      throw new Error('insufficient options provided!');
    }

    rebind(this, 'request', '_doUpdate', '_onUpdate');

    this.firstName = firstName;
    this.id = id;
    this.lastName = lastName;
    this.username = username;

    this._host = host;
    this._token = token;
    this._latestUpdateId = null;
    this._chats = new Map();

    const log = new Logger();
    log.friendlyName(`Telegram Client (${username})`);
    this._log = log.withPrefix(libName);

    this._updater = new LongPollClient(scheduler, this._doUpdate);
    this._updater.on('message', this._onUpdate);
  }

  _doUpdate() {
    const offset = this._latestUpdateId ? this._latestUpdateId + 1 : undefined;

    return this.request('getUpdates', {
      offset,
      timeout: updateTimeoutSeconds,
      allowed_updates: supportedUpdateTypes
    });
  }

  _onUpdate(result = []) {
    result.forEach((update) => {
      this._latestUpdateId = update.update_id;

      const type = supportedUpdateTypes.find((key) => {
        return update[key];
      });

      if (!type) return;

      const {
        [type]: payload,
        [type]: {
          chat: {
            id: chatId
          } = {}
        } = {}
      } = update;

      if (!this._chats.has(chatId)) return;

      this._chats.get(chatId).ingestMessage(type, payload);
    });
  }

  request(method, payload) {
    return telegramRequest(this._host, this._token, method, payload);
  }

  addChat(chatId) {
    if (this._chats.has(chatId)) {
      return Promise.resolve(this._chats.get(chatId));
    }

    return Chat.create(this, chatId).then((chat) => {
      this._chats.set(chatId, chat);

      return chat;
    });
  }

  start() {
    this._log.info('start');
    this._updater.start();
  }

  stop() {
    this._log.info('stop');
    this._updater.stop();
  }
}

function createTelegramClient(scheduler) {
  return Client.create(scheduler, configToken, apiHost);
}

module.exports = {
  chatIds,
  createTelegramClient
};
