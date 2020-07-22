import { eventSymbol, onlineState } from '../index.js';
import { UDPDevice } from '../udp.js';

const device = new UDPDevice({
  host: '127.0.0.1',
  keepAlive: 20000,
  port: 5000,
});

const service = device.getService(Buffer.from([0]));

device.once(onlineState.true, () => {
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

service.on(eventSymbol, (data) => {
  // eslint-disable-next-line no-console
  console.log('event', data.toString());
});
