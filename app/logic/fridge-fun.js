const { chatIds, TelegramChat } = require('../../libs/telegram');
const { arrayRandom } = require('../../libs/utils/structures');
// const { epochs } = require('../../libs/utils/time');
// const { post } = require('../../libs/http/client');

function fridgeTimer(fridge, fridgeTimeout, fridgeMessages) {
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

      telegramChat.send(arrayRandom(fridgeMessages)).catch((error) => {
        /* eslint-disable-next-line no-console */
        console.error(`error logging to telegram: "${error}"`);
      });
    }, fridgeTimeout);
  });
}

// function fridgeTwitter(fridge) {
//   const { instance } = fridge;
//   let start = null;

//   instance.on('change', () => {
//     if (instance.isOpen) {
//       start = Date.now();
//       return;
//     }

//     if (!start) return;

//     const seconds = Math.round((Date.now() - start) / epochs.second);

//     const url = new URL('https://api.twitter.com/1.1/statuses/update.json');
//     url.searchParams.append('status', `I was open for ${seconds} seconds.`);
//     post(url, null, {
//       headers: {
//         'content-type': 'application/json'
//       }
//     });
//   });
// }

(function main() {
  const {
    config: {
      globals: {
        fridgeTimeout,
        fridgeMessages
      }
    },
    doorSensors
  } = global;

  const fridge = doorSensors.find(({ name }) => {
    return name === 'kuecheFridge';
  });
  if (!fridge) return;

  fridgeTimer(fridge, fridgeTimeout, fridgeMessages);
  // fridgeTwitter(fridge);
}());
