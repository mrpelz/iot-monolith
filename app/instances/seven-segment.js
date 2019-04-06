const { SevenSegment } = require('../../libs/seven-segment');

function createSevenSegment(sevenSegment) {
  const {
    host,
    port
  } = sevenSegment;

  try {
    return new SevenSegment({
      host,
      port
    });
  } catch (e) {
    return null;
  }
}

(function main() {
  const {
    config: {
      globals: {
        sevenSegment
      }
    }
  } = global;

  const { disable = false, name, host } = sevenSegment;

  if (disable || !name) return;

  const instance = createSevenSegment(sevenSegment);

  if (!instance) return;

  instance.log.friendlyName(`${name} (HOST: ${host})`);
  instance.connect();

  global.sevenSegment = Object.assign({}, sevenSegment, {
    instance
  });
}());
