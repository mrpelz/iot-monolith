const { lights } = global;

lights.forEach((light) => {
  const { instance, type } = light;

  switch (type) {
    case 'OBI_JACK':
      instance.on('connect', () => {
        instance.ledBlink(5);
      });
      instance.on('buttonShortpress', () => {
        instance.relay(!instance.relayState);
        instance.ledBlink(instance.relayState ? 2 : 1);
      });
      break;
    default:
  }
});
