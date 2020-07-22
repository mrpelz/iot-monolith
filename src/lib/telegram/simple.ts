import { post } from '../http/client.js';
import { telegramToken } from '../../app/environment.js';

const host = 'api.telegram.org';
const chatId = -274728913;

const telegramHttpOptions = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
};

const telegramMessageOptions = {
  disable_web_page_preview: true,
  parse_mode: 'Markdown',
};

export function telegramSend(message: string): Promise<void> {
  if (!telegramToken) {
    throw new Error('missing env-variable "telegramToken"');
  }

  return post(
    `https://${host}/bot${telegramToken}/sendMessage`,
    Buffer.from(
      JSON.stringify({
        ...telegramMessageOptions,
        chat_id: chatId,
        text: message,
      }),
      'utf8'
    ),
    telegramHttpOptions
  ).then((response) => {
    const { ok, result } = JSON.parse(response);

    if (!ok) {
      throw new Error(JSON.stringify(result));
    }
  });
}
