function manageObiJackFan(fan) {
  const { instance } = fan;

  instance.on('connect', () => {
    instance.ledBlink(5);
  });

  instance.on('buttonShortpress', () => {
    instance.relay(!instance.relayState);
  });

  instance.on('change', () => {
    instance.ledBlink(instance.relayState ? 2 : 1);
  });
}

(function main() {
  const {
    fans
  } = global;

  fans.forEach((fan) => {
    const { type } = fan;

    switch (type) {
      case 'OBI_JACK':
        manageObiJackFan(fan);
        break;
      default:
    }
  });
}());
