import { post } from '../http/client.js';
import { telegramToken } from '../../app/environment.js';

const host = 'api.telegram.org';
const chatId = -274728913;

const telegramHttpOptions = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
};

const telegramMessageOptions = {
  parse_mode: 'Markdown',
  disable_web_page_preview: true
};

export function telegramSend(message) {
  if (!telegramToken) {
    throw new Error('<3>missing env-variable "telegramToken"');
  }

  return post(
    `https://${host}/bot${telegramToken}/sendMessage`,
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
    console.log(`<3>error logging to telegram: "${error}"`);
  });
}
