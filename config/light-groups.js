export default [
  {
    attributes: {
      hmi: {
        group: 'lamp-group',
        groupLabel: 'group',
        section: 'duschbad',
        sortGroup: '_top',
      },
    },
    lights: ['duschbadDeckenlampe', 'duschbadSpiegellampe', 'duschbadLampe'],
    name: 'duschbadLamps',
  },
  {
    attributes: {
      hmi: {
        group: 'ceiling-lamp-group',
        groupLabel: 'ceiling-lamp',
        section: 'flur',
        sortGroup: 'group',
        subGroup: 'group',
      },
      light: {
        allOf: true,
      },
    },
    lights: ['flurDeckenlampeFront', 'flurDeckenlampeBack'],
    name: 'flurDeckenlampe',
  },
  {
    attributes: {
      hmi: {
        group: 'led',
        section: 'kueche',
        sortGroup: '_top',
      },
    },
    lights: [
      'kuecheLedLeftUp',
      'kuecheLedLeftWhite',
      'kuecheLedLeftWWhite',
      'kuecheLedRightUp',
      'kuecheLedRightWhite',
      'kuecheLedRightWWhite',
    ],
    name: 'kuecheLed',
  },
  {
    attributes: {
      hmi: {
        group: '§{all} §{lamps}',
        section: 'schlafzimmer',
      },
    },
    lights: [
      'schlafzimmerDeckenlampe',
      'schlafzimmerSteinlampe',
      'schlafzimmerBedLedRed',
      'schlafzimmerBedLedGreen',
      'schlafzimmerBedLedBlue',
      'schlafzimmerBedLedWhite',
      'schlafzimmerBedLedFloor',
      'schlafzimmerBedLedNightstandLeft',
      'schlafzimmerBedLedNightstandRight',
    ],
    name: 'schlafzimmerLamps',
  },
  {
    attributes: {
      hmi: {
        group: '🍆',
        section: 'schlafzimmer',
      },
    },
    lights: ['schlafzimmerBedLedRed', 'schlafzimmerBedLedFloor'],
    name: 'schlafzimmerFuckLight',
  },
  {
    attributes: {
      hmi: {
        group: 'lamp-group',
        groupLabel: 'group',
        section: 'wannenbad',
        sortGroup: '_top',
      },
    },
    lights: ['wannenbadDeckenlampe', 'wannenbadLampe'],
    name: 'wannenbadLamps',
  },
  {
    attributes: {
      hmi: {
        group: 'led-all',
        groupLabel: 'led',
        section: 'wohnzimmer',
        sortGroup: 'all',
        subGroup: 'all',
      },
    },
    lights: [
      'wohnzimmerKallaxLedBlue',
      'wohnzimmerKallaxLedGreen',
      'wohnzimmerKallaxLedRed',
      'wohnzimmerKallaxLedWWhite',
    ],
    name: 'wohnzimmerLedAll',
  },
  {
    attributes: {
      hmi: {
        group: '~§{wohnzimmer}',
        section: 'wohnzimmer',
      },
    },
    lights: [
      'esszimmerDeckenlampe',
      'esszimmerFloodlight',
      'esszimmerStehlampe',
      'flurDeckenlampeBack',
      'flurDeckenlampeFront',
      'kuecheLedLeftUp',
      'kuecheLedLeftWhite',
      'kuecheLedLeftWWhite',
      'kuecheLedRightUp',
      'kuecheLedRightWhite',
      'kuecheLedRightWWhite',
      'wohnzimmerDeckenlampe',
      'wohnzimmerKallaxLedBlue',
      'wohnzimmerKallaxLedGreen',
      'wohnzimmerKallaxLedRed',
      'wohnzimmerKallaxLedWWhite',
      'wohnzimmerStehlampe',
    ],
    name: 'wohnzimmerRelated',
  },
];
