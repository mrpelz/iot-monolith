const { Timer } = require('../../libs/utils/time');
const { resolveAlways } = require('../../libs/utils/oop');

async function entryDoorTimer(telegram, entryDoor, entryDoorTimeout, entryDoorMessage) {
  const { client: awaitingClient, chatIds } = telegram;
  const { instance } = entryDoor;

  const client = await awaitingClient; // wait for bot instance is available

  const messages = [];
  const deleteMessages = () => {
    messages.forEach((message) => {
      resolveAlways(message.delete());
    });
    messages.length = 0;
  };

  const chat = await client.addChat(chatIds.iot);
  const timer = new Timer(entryDoorTimeout);

  timer.on('hit', () => {
    chat.addMessage({
      text: entryDoorMessage
    }).then((message) => {
      messages.push(message);
    });
  });

  instance.on('change', () => {
    timer.stop();

    if (!instance.isOpen) {
      deleteMessages();
      return;
    }

    timer.start();
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
