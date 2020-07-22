import { ApplicationConfig, ApplicationState } from '../app.js';
import { createTelegramClient } from '../../lib/telegram/index.js';
import { telegramToken } from '../../app/environment.js';

type ChatIds = {
  [chatName: string]: number;
};

type TelegramPersistence = {
  [chatId: string]: {
    messages: {
      date: number;
      from: number;
      id: number;
      text: string;
    }[];
  };
};

export type TelegramState = {
  client: ReturnType<typeof createTelegramClient>;
  chatIds: ChatIds;
};

export type State = {
  telegram: TelegramState;
};

export function create(
  config: ApplicationConfig,
  data: ApplicationState
): void {
  const {
    telegram: { host, chatIds },
  } = config;

  const { db, scheduler } = data;

  try {
    const telegramDb = db.get<TelegramPersistence>('telegram');
    const client = createTelegramClient(
      scheduler,
      telegramToken,
      host,
      telegramDb
    );

    client.then((instance) => {
      instance.start();
    });

    Object.defineProperty(data, 'telegram', {
      value: {
        chatIds,
        client,
      },
    });
  } catch (error) {
    throw new Error(`could not create telegram instance: ${error}`);
  }
}
