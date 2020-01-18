const { Device } = require('./index');
const { TCPTransport } = require('../transport/tcp');

 /**
  * @typedef I_TCPTransportOptions
  * @type {import('../transport/tcp').TCPTransportOptions}
  */

class TCPDevice extends Device {

  /**
   * create instance of Device
   * @param {I_TCPTransportOptions} options configuration object
   */
  constructor(options) {
    const transport = new TCPTransport(options);

    super({
      transport,
      keepAlive: options.keepAlive
    });

    transport.connect();
  }
}

module.exports = {
  TCPDevice
};
