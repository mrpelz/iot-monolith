import { UDPDevice } from '../udp.js';

const device = new UDPDevice({
  host: '10.97.0.198',
  port: 8266,
});

const event = device.getEvent(Buffer.from([0]));
const service = device.getService(Buffer.from([1]), 2000);

device.state.isOnline.observe((online) => {
  if (!online) return;

  const request = service.request(Buffer.from('test'));

  request
    .then((result) => {
      // eslint-disable-next-line no-console
      console.log('request response', result.toString());
    })
    .catch((reason) => {
      // eslint-disable-next-line no-console
      console.log('request failed', reason);
    });
});

event.observable.observe((data) => {
  // eslint-disable-next-line no-console
  console.log('event', data.toString());
});
