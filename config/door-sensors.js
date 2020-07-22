export default [
  {
    attributes: {
      hmi: {
        section: 'wannenbad',
      },
    },
    id: 45076,
    name: 'wannenbadDoor',
  },
  {
    attributes: {
      hmi: {
        section: 'schlafzimmer',
      },
    },
    id: 45295,
    name: 'schlafzimmerDoor',
  },
  {
    attributes: {
      hmi: {
        section: 'abstellraum',
      },
    },
    id: 3477,
    name: 'abstellraumDoor',
  },
  {
    attributes: {
      hmi: {
        category: 'security',
        group: 'entry-door',
        section: 'global',
        sortCategory: '_top',
        sortGroup: 'door',
      },
      security: {
        alarmLevel: 0,
      },
    },
    id: 3439,
    name: 'entryDoor',
  },
  {
    attributes: {
      hmi: {
        section: 'duschbad',
      },
    },
    id: 45016,
    name: 'duschbadDoor',
  },
  {
    attributes: {
      hmi: {
        section: 'arbeitszimmer',
      },
    },
    id: 3481,
    name: 'arbeitszimmerDoor',
  },
  {
    attributes: {
      hmi: {
        group: 'windowLeft',
        groupLabel: 'window',
        section: 'arbeitszimmer',
        subGroup: 'left',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 51866,
    name: 'arbeitszimmerWindowLeft',
  },
  {
    attributes: {
      hmi: {
        group: 'windowRight',
        groupLabel: 'window',
        section: 'arbeitszimmer',
        subGroup: 'right',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 52455,
    name: 'arbeitszimmerWindowRight',
  },
  {
    attributes: {
      hmi: {
        group: 'window',
        section: 'schlafzimmer',
        subLabel: 'left',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 47642,
    name: 'schlafzimmerWindowLeft',
  },
  {
    attributes: {
      hmi: {
        group: 'window-door',
        section: 'schlafzimmer',
        subLabel: 'right',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 15442,
    name: 'schlafzimmerWindowDoorRight',
  },
  {
    attributes: {
      hmi: {
        group: 'window-door',
        section: 'kueche',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 52595,
    name: 'kuecheWindowDoor',
  },
  {
    attributes: {
      hmi: {
        group: 'window-door',
        section: 'wohnzimmer',
        subType: 'window',
      },
      security: {
        outwards: true,
      },
    },
    id: 41906,
    name: 'wohnzimmerWindowDoor',
  },
  {
    attributes: {
      hmi: {
        group: 'fridge',
        section: 'kueche',
      },
    },
    id: 3464,
    name: 'kuecheFridge',
  },
];
