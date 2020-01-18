const { onlineState, eventSymbol } = require('../index');
const { UDPDevice } = require('../udp');

const device = new UDPDevice({
  host: '127.0.0.1',
  port: 5000,
  keepAlive: 20000
});

const service = device.getService(Buffer.from([0]));

device.once(onlineState.true, () => {
  const request = service.request(Buffer.from('test'));

  request.then((result) => {
    // eslint-disable-next-line no-console
    console.log('request response', result.toString());
  }).catch((reason) => {
    // eslint-disable-next-line no-console
    console.log('request failed', reason);
  });
});

service.on(eventSymbol, (data) => {
  // eslint-disable-next-line no-console
  console.log('event', data.toString());
});
