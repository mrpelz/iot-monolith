// const { epochs } = require('../../libs/utils/time');
// const { post } = require('../../libs/http/client');
const { createInlineKeyboard } = require('../../libs/telegram');
const { resolveAlways } = require('../../libs/utils/oop');

async function fridgeTimer(telegram, fridge, fridgeTimeout, fridgeMessage) {
  const { client: awaitingClient, chatIds } = telegram;

  const client = await awaitingClient; // wait for bot instance is available

  const { instance } = fridge;
  let timer = null;
  const messages = [];

  const chat = await client.addChat(chatIds.iot);

  const deleteMessages = () => {
    return Promise.all(messages.map((message) => {
      return resolveAlways(message.delete());
    })).then((result) => {
      messages.length = 0;

      return result;
    });
  };

  const deleteInlineKeyboard = createInlineKeyboard([
    [
      {
        text: 'Ausblenden',
        callback: () => {
          return deleteMessages().then(() => {
            return 'ausgeblendet';
          });
        }
      }
    ]
  ]);

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  instance.on('change', () => {
    clear();

    if (!instance.isOpen) {
      deleteMessages();
      return;
    }

    timer = setTimeout(() => {
      clear();

      chat.addMessage({
        text: fridgeMessage,
        inlineKeyboard: deleteInlineKeyboard
      }).then((message) => {
        messages.push(message);
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
    doorSensors,
    telegram
  } = global;

  const fridge = doorSensors.find(({ name }) => {
    return name === 'kuecheFridge';
  });
  if (!fridge) return;

  fridgeTimer(telegram, fridge, fridgeTimeout, fridgeMessage);
  // fridgeTwitter(fridge);
}());
