const { MessageClient } = require('../messaging');

const libName = 'led';

function getMessageTypes(channels) {
  return Array(channels).map((_, index) => {
    return index;
  });
}

class LedDriver extends MessageClient {
  constructor(options = {}) {
    const {
      host = null,
      port = null,
      channels = 0
    } = options;

    if (!host || !port || !channels) {
      throw new Error('insufficient options provided');
    }

    super({
      host,
      port,
      messageTypes: getMessageTypes(channels)
    });

    this._ledDriver = {};
    this._ledDriver.channels = channels;

    this.log.friendlyName(`Driver ${host}:${port}`);
    this._ledDriver.log = this.log.withPrefix(libName);
  }
}

module.exports = {
  LedDriver
};
