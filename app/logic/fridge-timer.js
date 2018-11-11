const { chatIds, TelegramChat } = require('../../libs/telegram');

(function main() {
  const {
    config: {
      globals: {
        fridgeTimeout
      }
    },
    doorSensors
  } = global;

  const fridge = doorSensors.find(({ name }) => {
    return name === 'kuecheFridge';
  });
  if (!fridge) return;

  const { instance } = fridge;
  let timer = null;

  const telegramChat = new TelegramChat(chatIds.iot);

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  instance.on('change', () => {
    clear();

    if (!instance.isOpen) return;

    timer = setTimeout(() => {
      clear();

      telegramChat.send('Bitte mach den Kühlschrank zu. 🥶').catch((error) => {
        /* eslint-disable-next-line no-console */
        console.error(`error logging to telegram: "${error}"`);
      });
    }, fridgeTimeout);
  });
}());
