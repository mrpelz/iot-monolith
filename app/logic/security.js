const { chatIds, TelegramChat } = require('../../libs/telegram');

function entryDoorTimer(entryDoor, entryDoorTimeout, entryDoorMessage) {
  const { instance } = entryDoor;
  let timer = null;

  const telegramChat = new TelegramChat(chatIds.iot);

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
      telegramChat.send(entryDoorMessage);
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
    doorSensors
  } = global;

  const entryDoor = doorSensors.find(({ name }) => {
    return name === 'entryDoor';
  });
  if (!entryDoor) return;

  entryDoorTimer(entryDoor, entryDoorTimeout, entryDoorMessage);
}());
