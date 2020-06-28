import { LongPollClient, post } from '../http/client.js';
import { excludeKeys, flattenArrays, getKey } from '../utils/structures.js';
import { rebind, resolveAlways } from '../utils/oop.js';
import { Logger } from '../log/index.js';
import { randomString } from '../utils/data.js';

const libName = 'telegram';

const updateTimeoutSeconds = 60;
const supportedUpdateTypes = [
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  // 'inline_query',
  // 'chosen_inline_result',
  'callback_query',
  // 'shipping_query',
  // 'pre_checkout_query'
];
const editMethods = {
  text: 'editMessageText',
  caption: 'editMessageCaption',
  media: 'editMessageMedia',
  reply_markup: 'editMessageReplyMarkup'
};

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

class InlineKeyboardButton {
  constructor(options = {}) {
    const {
      callback,
      text,
      url
    } = options;

    if (!text || !(callback || url) || (callback && url)) {
      throw new Error('insufficient options provided!');
    }

    this.id = randomString(32);
    this.callback = callback;
    this.text = text;
    this.url = url;
  }

  get() {
    return {
      callback_data: this.id,
      text: this.text,
      url: this.url
    };
  }
}

class InlineKeyboardRow {
  constructor(buttons = []) {
    this.buttons = new Set();

    this._addButtons(buttons);
  }

  _addButtons(buttons) {
    buttons.forEach((button) => {
      if (!(button instanceof InlineKeyboardButton)) {
        throw new Error('insufficient arguments provided');
      }

      this.buttons.add(button);
    });
  }

  get() {
    return Array.from(this.buttons).map((button) => {
      return button.get();
    });
  }
}

class InlineKeyboard {
  constructor(rows = []) {
    this.rows = new Set();

    this._addRows(rows);
  }

  _addRows(rows) {
    rows.forEach((row) => {
      if (!(row instanceof InlineKeyboardRow)) {
        throw new Error('insufficient arguments provided');
      }

      this.rows.add(row);
    });
  }

  get() {
    return Array.from(this.rows).map((row) => {
      return row.get();
    });
  }

  query(options = {}) {
    const {
      data
    } = options;

    return flattenArrays(Array.from(this.rows).map((row) => {
      return Array.from(row.buttons);
    })).find((button) => {
      return button.id === data;
    });
  }
}

class Message {
  static createPayload(chat = {}, options = {}) {
    const {
      html,
      inlineKeyboard,
      markdown,
      notification = true,
      pagePreviews = true,
      responseToId,
      text
    } = options;

    if (!text) throw new Error('no text specified');
    if (inlineKeyboard && !(inlineKeyboard instanceof InlineKeyboard)) {
      throw new Error('inlineKeyboard not provided correctly');
    }

    let parseMode;
    if (html) parseMode = 'HTML';
    else if (markdown) parseMode = 'Markdown';

    let replyMarkup;
    if (inlineKeyboard) {
      replyMarkup = {
        inline_keyboard: inlineKeyboard.get()
      };
    }

    return {
      chat_id: chat.id,
      disable_notification: !notification,
      disable_web_page_preview: !pagePreviews,
      parse_mode: parseMode,
      reply_markup: replyMarkup,
      reply_to_message_id: responseToId,
      text
    };
  }

  static createOutgoing(client, chat, options) {
    if (!client || !chat || !options) {
      throw new Error('insufficient options provided!');
    }

    const { inlineKeyboard } = options;

    return client.request('sendMessage', Message.createPayload(chat, options)).then((payload) => {
      if (!payload) throw new Error('error sending message');

      const {
        date,
        from: {
          id: fromId = null
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
        inlineKeyboard,
        text,
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
      inlineKeyboard,
      text
    } = options;

    if (!chat || !client || !id || !date) {
      throw new Error('insufficient options provided!');
    }

    this.date = new Date(date);
    this.deleted = false;
    this.editDate = null;
    this.from = from;
    this.id = id;
    this.mine = from === client.id;
    this.text = text;

    this._chat = chat;
    this._client = client;
    this._inlineKeyboard = inlineKeyboard;
  }

  internalEdit(editDate, newText) {
    if (this.deleted) return;

    this.editDate = new Date(editDate);
    this.text = newText;
  }

  callbackQuery(options) {
    if (this.deleted || !this._inlineKeyboard) return;

    const { id } = options;

    const button = this._inlineKeyboard.query(options);
    resolveAlways(this._client.request('answerCallbackQuery', {
      callback_query_id: id
    })).then(() => {
      if (!button) return;

      button.callback(button, this, this._chat, this._client);
    });
  }

  edit(options = {}) {
    if (this.deleted) return Promise.reject();

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
    if (this.deleted) return Promise.reject();

    return this._client.request('deleteMessage', {
      chat_id: this._chat.id,
      message_id: this.id
    }).then((result) => {
      this.deleted = true;

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

  static restoreMessages(client, chat) {
    const { db } = client;
    const messages = new Map();
    const { messages: saved = [] } = getKey(db, chat.id.toString());

    saved.forEach((msg = {}) => {
      const {
        date,
        from,
        id,
        text
      } = msg;

      messages.set(id, new Message({
        chat,
        client,
        date,
        from,
        id,
        text
      }));
    });

    return messages;
  }

  static storeMessages(client, messages, chat) {
    const { db } = client;

    const chatDb = getKey(db, chat.id.toString());

    const saved = [];
    messages.forEach((msg) => {
      const {
        date,
        deleted,
        from,
        id,
        text
      } = msg;

      if (deleted) return;

      saved.push({
        date: date.getTime(),
        from,
        id,
        text
      });
    });

    chatDb.messages = saved;
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

    this._messages = Chat.restoreMessages(client, this);
  }

  ingestMessage(payload = {}) {
    const {
      date,
      from: {
        id: fromId
      } = {},
      message_id: messageId,
      text
    } = payload;

    if (text === undefined) return;

    this._messages.set(messageId, new Message({
      chat: this,
      client: this._client,
      date,
      from: fromId,
      id: messageId,
      text
    }));
  }

  ingestEditedMessage(payload = {}) {
    const {
      edit_date: editDate,
      message_id: messageId,
      text
    } = payload;

    if (text === undefined) return;

    if (this._messages.has(messageId)) {
      this._messages.get(messageId).internalEdit(editDate, text);
    }
  }

  ingestCallbackQuery(payload = {}) {
    const {
      data,
      from: {
        id: fromId
      } = {},
      id,
      message: {
        message_id: messageId
      } = {},
    } = payload;

    if (data === undefined) return;

    if (this._messages.has(messageId)) {
      this._messages.get(messageId).callbackQuery({
        id,
        data,
        fromId
      });
    }
  }

  ingestUpdate(type, payload = {}) {
    switch (type) {
      case 'message':
      case 'channel_post':
        this.ingestMessage(payload);
        break;
      case 'edited_message':
      case 'edited_channel_post':
        this.ingestEditedMessage(payload);
        break;
      case 'callback_query':
        this.ingestCallbackQuery(payload);
        break;
      default:
    }

    Chat.storeMessages(this._client, this._messages, this);
  }

  addMessage(options) {
    return Message.createOutgoing(this._client, this, options).then((message) => {
      this._messages.set(message.id, message);

      Chat.storeMessages(this._client, this._messages, this);

      return message;
    });
  }

  clear() {
    const deletions = [];

    this._messages.forEach((msg, id) => {
      deletions.push(resolveAlways(msg.delete()).then(() => {
        this._messages.delete(id);
      }));
    });

    return Promise.all(deletions).then(() => {
      Chat.storeMessages(this._client, this._messages, this);
    });
  }
}

class Client {
  static create(scheduler, token, host, db) {
    if (!scheduler || !token || !host || !db) {
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
        db,
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
      db,
      firstName,
      host,
      id,
      lastName,
      scheduler,
      token,
      username
    } = options;

    if (!id || !token || !scheduler || !host || !db) {
      throw new Error('insufficient options provided!');
    }

    rebind(this, 'request', '_doUpdate', '_onUpdate');

    this.db = db;
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
            id: chatIdA
          } = {},
          message: {
            chat: {
              id: chatIdB
            } = {}
          } = {}
        } = {}
      } = update;

      const chatId = chatIdA || chatIdB;

      if (!chatId) return;

      if (!this._chats.has(chatId)) return;

      this._chats.get(chatId).ingestUpdate(type, payload);
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

export function createTelegramClient(scheduler, token, host, db) {
  return Client.create(scheduler, token, host, db);
}

export function createInlineKeyboard(layout = []) {
  return new InlineKeyboard(layout.map((row) => {
    return new InlineKeyboardRow(row.map((button) => {
      return new InlineKeyboardButton(button);
    }));
  }));
}
