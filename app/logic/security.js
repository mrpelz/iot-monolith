const { createInlineKeyboard } = require('../../libs/telegram');
const { resolveAlways } = require('../../libs/utils/oop');

async function entryDoorTimer(telegram, entryDoor, entryDoorTimeout, entryDoorMessage) {
  const { client: awaitingClient, chatIds } = telegram;

  const client = await awaitingClient; // wait for bot instance is available

  const { instance } = entryDoor;
  let timer = null;

  const chat = await client.addChat(chatIds.iot);

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  instance.on('change', () => {
    clear();

    if (!instance.isOpen) {
      return;
    }

    timer = setTimeout(() => {
      clear();
      chat.addMessage({
        text: entryDoorMessage,
        inlineKeyboard: createInlineKeyboard([
          [
            {
              text: 'Löschen',
              callback: (_, message) => {
                resolveAlways(message.delete());
              }
            }
          ]
        ])
      });
    }, entryDoorTimeout);
  });
}

(function main() {
  const {
    config: {
      globals: {
        entryDoorTimeout,
        entryDoorMessage
      }
    },
    doorSensors,
    telegram
  } = global;

  const entryDoor = doorSensors.find(({ name }) => {
    return name === 'entryDoor';
  });
  if (!entryDoor) return;

  entryDoorTimer(telegram, entryDoor, entryDoorTimeout, entryDoorMessage);
}());
