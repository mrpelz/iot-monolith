const { chatIds, TelegramChat } = require('../../libs/telegram');
// const { epochs } = require('../../libs/utils/time');
// const { post } = require('../../libs/http/client');

function fridgeTimer(fridge, fridgeTimeout, fridgeMessage) {
  const { instance } = fridge;
  let timer = null;
  const closeIds = [];

  const telegramChat = new TelegramChat(chatIds.iot);

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  instance.on('change', () => {
    clear();

    if (!instance.isOpen) {
      closeIds.forEach((id) => {
        telegramChat.delete(id);
      });

      closeIds.length = 0;
      return;
    }

    timer = setTimeout(() => {
      clear();

      telegramChat.send(fridgeMessage).then(({ message_id: messageId }) => {
        closeIds.push(messageId);
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
        fridgeMessage
      }
    },
    doorSensors
  } = global;

  const fridge = doorSensors.find(({ name }) => {
    return name === 'kuecheFridge';
  });
  if (!fridge) return;

  fridgeTimer(fridge, fridgeTimeout, fridgeMessage);
  // fridgeTwitter(fridge);
}());
