const { Device } = require('./index');
const { UDPTransport } = require('../transport/udp');

 /**
  * @typedef I_UDPTransportOptions
  * @type {import('../transport/udp').UDPTransportOptions}
  */

class UDPDevice extends Device {

  /**
   * create instance of Device
   * @param {I_UDPTransportOptions} options configuration object
   */
  constructor(options) {
    const transport = new UDPTransport(options);

    super({
      transport,
      keepAlive: options.keepAlive
    });

    transport.connect();
  }
}

module.exports = {
  UDPDevice
};
