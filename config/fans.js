export default [
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    fans: [
      {
        attributes: {
          hmi: {
            section: 'wohnzimmer',
          },
        },
        name: 'wohnzimmerFan',
        useChannel: 0,
      },
    ],
    host: '10.97.4.13',
    name: 'wohnzimmerFanDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    disable: true,
    fans: [
      {
        attributes: {
          hmi: {
            section: 'schlafzimmer',
          },
        },
        name: 'schlafzimmerFan',
        useChannel: 0,
      },
    ],
    host: '10.97.4.33',
    name: 'schlafzimmerFanDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
];
