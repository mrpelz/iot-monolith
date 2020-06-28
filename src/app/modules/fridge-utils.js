// const { epochs } = require('../../lib/utils/time');
// const { post } = require('../../lib/http/client');
import { Timer } from '../../lib/utils/time.js';
import { resolveAlways } from '../../lib/utils/oop.js';

async function fridgeTimer(telegram, fridge, fridgeTimeout, fridgeMessage) {
  const { client: awaitingClient, chatIds } = telegram;
  const { instance } = fridge;

  const client = await awaitingClient; // wait for bot instance is available

  const messages = [];
  const deleteMessages = () => {
    messages.forEach((message) => {
      resolveAlways(message.delete());
    });
    messages.length = 0;
  };

  const chat = await client.addChat(chatIds.iot);
  const timer = new Timer(fridgeTimeout);

  timer.on('hit', () => {
    chat.addMessage({
      text: fridgeMessage
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

export function manage(config, data) {
  const {
    globals: {
      fridgeTimeout,
      fridgeMessage
    }
  } = config;

  const {
    doorSensors,
    telegram
  } = data;

  const fridge = doorSensors.find(({ name }) => {
    return name === 'kuecheFridge';
  });
  if (!fridge) return;

  fridgeTimer(telegram, fridge, fridgeTimeout, fridgeMessage);
  // fridgeTwitter(fridge);
}
