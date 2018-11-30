const { post } = require('../http/client');

const {
  apiHost,
  token,
  chatIds
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

function telegramSend(chatId, message) {
  return post(
    `https://${apiHost}/bot${token}/sendMessage`,
    Buffer.from(JSON.stringify(Object.assign(telegramMessageOptions, {
      chat_id: chatId,
      text: message
    })), 'utf8'),
    telegramHttpOptions
  ).then((response) => {
    const { ok, result } = JSON.parse(response);

    if (!ok) {
      throw new Error(JSON.stringify(result));
    }
  }).catch((error) => {
    /* eslint-disable-next-line no-console */
    console.error(`error logging to telegram: "${error}"`);
  });
}

module.exports = {
  chatIds,
  telegramSend
};
