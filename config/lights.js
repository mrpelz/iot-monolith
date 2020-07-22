export default [
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.46',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'abstellraum',
          },
        },
        name: 'abstellraumDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'abstellraumDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.45',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'arbeitszimmer',
          },
        },
        name: 'arbeitszimmerDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'arbeitszimmerDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.44',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'duschbad',
          },
        },
        name: 'duschbadDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'duschbadDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.42',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'mirror-lamp',
            section: 'duschbad',
          },
        },
        name: 'duschbadSpiegellampe',
        useChannel: 0,
      },
    ],
    name: 'duschbadSpiegellampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.41',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'lamp',
            section: 'duschbad',
          },
        },
        name: 'duschbadLampe',
        useChannel: 0,
      },
    ],
    name: 'duschbadLampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.38',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'esszimmer',
          },
        },
        name: 'esszimmerDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'esszimmerDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.33',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'flood-lamp',
            section: 'esszimmer',
          },
        },
        name: 'esszimmerFloodlight',
        useChannel: 0,
      },
    ],
    name: 'esszimmerFloodlightDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.12',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'standing-lamp',
            section: 'esszimmer',
          },
        },
        name: 'esszimmerStehlampe',
        useChannel: 0,
      },
    ],
    name: 'esszimmerStehlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.49',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp-front',
            groupLabel: 'ceiling-lamp',
            section: 'flur',
            sortGroup: 'front',
            subGroup: 'front',
          },
        },
        name: 'flurDeckenlampeFront',
        useChannel: 0,
      },
    ],
    name: 'flurDeckenlampeFrontDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.50',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp-back',
            groupLabel: 'ceiling-lamp',
            section: 'flur',
            sortGroup: 'back',
            subGroup: 'back',
          },
        },
        name: 'flurDeckenlampeBack',
        useChannel: 0,
      },
    ],
    name: 'flurDeckenlampeBackDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    host: '10.97.4.55',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'kuecheLedLeftUp',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'left',
            subGroup: '§{up} §{left}',
          },
        },
        name: 'kuecheLedLeftUp',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 2,
      },
      {
        attributes: {
          hmi: {
            group: 'kuecheLedLeftWhite',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'left',
            subGroup: '§{c-white} §{left}',
          },
        },
        name: 'kuecheLedLeftWhite',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 1,
      },
      {
        attributes: {
          hmi: {
            group: 'kuecheLedLeftWWhite',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'left',
            subGroup: '§{w-white} §{left}',
          },
        },
        name: 'kuecheLedLeftWWhite',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 0,
      },
      {
        attributes: {
          hmi: {
            group: 'kuecheLedRightUp',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'right',
            subGroup: '§{up} §{right}',
          },
        },
        name: 'kuecheLedRightUp',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 5,
      },
      {
        attributes: {
          hmi: {
            group: 'kuecheLedRightWhite',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'right',
            subGroup: '§{c-white} §{right}',
          },
        },
        name: 'kuecheLedRightWhite',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 3,
      },
      {
        attributes: {
          hmi: {
            group: 'kuecheLedRightWWhite',
            groupLabel: 'led',
            section: 'kueche',
            sortGroup: 'right',
            subGroup: '§{w-white} §{right}',
          },
        },
        name: 'kuecheLedRightWWhite',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 4,
      },
    ],
    name: 'kuecheLedDriver',
    port: 5045,
    type: 'LED_DMX',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.47',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'schlafzimmer',
          },
        },
        name: 'schlafzimmerDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'schlafzimmerDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.32',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'stone-lamp',
            section: 'schlafzimmer',
          },
        },
        name: 'schlafzimmerSteinlampe',
        useChannel: 0,
      },
    ],
    name: 'schlafzimmerSteinlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    host: '10.97.4.54',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'led-red',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'red',
            subGroup: 'red',
          },
        },
        name: 'schlafzimmerBedLedRed',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 0,
      },
      {
        attributes: {
          hmi: {
            group: 'led-green',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'green',
            subGroup: 'green',
          },
        },
        name: 'schlafzimmerBedLedGreen',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 1,
      },
      {
        attributes: {
          hmi: {
            group: 'led-blue',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'blue',
            subGroup: 'blue',
          },
        },
        name: 'schlafzimmerBedLedBlue',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 2,
      },
      {
        attributes: {
          hmi: {
            group: 'led-white',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'w-white',
            subGroup: 'w-white',
          },
        },
        name: 'schlafzimmerBedLedWhite',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 3,
      },
      {
        attributes: {
          hmi: {
            group: 'led-floor',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'floor',
            subGroup: 'floor',
          },
        },
        gamma: 2.2,
        name: 'schlafzimmerBedLedFloor',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 4,
      },
      {
        attributes: {
          hmi: {
            group: 'led-nightstand-left',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'left',
            subGroup: '§{nightstand} §{left}',
          },
        },
        gamma: 2.2,
        name: 'schlafzimmerBedLedNightstandLeft',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 5,
      },
      {
        attributes: {
          hmi: {
            group: 'led-nightstand-right',
            groupLabel: 'led',
            section: 'schlafzimmer',
            sortGroup: 'right',
            subGroup: '§{nightstand} §{right}',
          },
        },
        gamma: 2.2,
        name: 'schlafzimmerBedLedNightstandRight',
        steps: [0, 0.3, 0.6, 1],
        useChannel: 6,
      },
    ],
    name: 'schlafzimmerBedLedDriver',
    port: 5045,
    type: 'LED_DMX',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.43',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'wannenbad',
          },
        },
        name: 'wannenbadDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'wannenbadDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.48',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'lamp',
            section: 'wannenbad',
          },
        },
        name: 'wannenbadLampe',
        useChannel: 0,
      },
    ],
    name: 'wannenbadLampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.39',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'ceiling-lamp',
            section: 'wohnzimmer',
          },
        },
        name: 'wohnzimmerDeckenlampe',
        useChannel: 0,
      },
    ],
    name: 'wohnzimmerDeckenlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    attributes: {
      driver: {
        enableButton: true,
      },
    },
    host: '10.97.4.11',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'standing-lamp',
            section: 'wohnzimmer',
          },
        },
        name: 'wohnzimmerStehlampe',
        useChannel: 0,
      },
    ],
    name: 'wohnzimmerStehlampeDriver',
    port: 5045,
    type: 'SONOFF_BASIC',
  },
  {
    host: '10.97.4.51',
    lights: [
      {
        attributes: {
          hmi: {
            group: 'led-red',
            groupLabel: 'led',
            section: 'wohnzimmer',
            sortGroup: 'red',
            subGroup: 'red',
          },
        },
        name: 'wohnzimmerKallaxLedRed',
        useChannel: 0,
      },
      {
        attributes: {
          hmi: {
            group: 'led-green',
            groupLabel: 'led',
            section: 'wohnzimmer',
            sortGroup: 'green',
            subGroup: 'green',
          },
        },
        name: 'wohnzimmerKallaxLedGreen',
        useChannel: 1,
      },
      {
        attributes: {
          hmi: {
            group: 'led-blue',
            groupLabel: 'led',
            section: 'wohnzimmer',
            sortGroup: 'blue',
            subGroup: 'blue',
          },
        },
        name: 'wohnzimmerKallaxLedBlue',
        useChannel: 2,
      },
      {
        attributes: {
          hmi: {
            group: 'led-w-white',
            groupLabel: 'led',
            section: 'wohnzimmer',
            sortGroup: 'w-white',
            subGroup: 'w-white',
          },
        },
        name: 'wohnzimmerKallaxLedWWhite',
        useChannel: 3,
      },
    ],
    name: 'wohnzimmerKallaxLedDriver',
    port: 5045,
    type: 'LED_H801',
  },
];
