export default [
  {
    attributes: {
      hmi: {
        section: 'wohnzimmer',
      },
    },
    disable: true,
    host: '10.97.4.10',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'wohnzimmer',
    port: 3000,
  },
  {
    attributes: {
      hmi: {
        section: 'esszimmer',
      },
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'esszimmer',
  },
  {
    attributes: {
      hmi: {
        section: 'kueche',
      },
    },
    host: '10.97.0.228',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness', 'movement'],
    name: 'kueche',
    port: 5045,
  },
  {
    attributes: {
      hmi: {
        section: 'schlafzimmer',
      },
    },
    host: '10.97.0.226',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness', 'movement'],
    name: 'schlafzimmer',
    port: 5045,
  },
  {
    attributes: {
      hmi: {
        section: 'arbeitszimmer',
      },
    },
    host: '10.97.0.222',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness', 'movement'],
    name: 'arbeitszimmer',
    port: 5045,
  },
  {
    attributes: {
      hmi: {
        section: 'flur',
      },
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'flur',
  },
  {
    attributes: {
      hmi: {
        section: 'abstellraum',
      },
    },
    host: '10.97.0.229',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness', 'movement'],
    name: 'abstellraum',
    port: 5045,
  },
  {
    addnTimeout: 5000,
    attributes: {
      hmi: {
        section: 'duschbad',
      },
    },
    disable: true,
    host: 'panucci.net.wurstsalat.cloud',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'duschbad',
    port: 3000,
  },
  {
    attributes: {
      hmi: {
        section: 'wannenbad',
      },
    },
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'wannenbad',
  },
  {
    attributes: {
      hmi: {
        section: 'terrasse',
      },
    },
    metrics: [
      'temperature',
      'pressure',
      'humidity',
      'brightness',
      'precipitation',
      'eco2',
      'tvoc',
    ],
    name: 'terrasse',
  },
  {
    attributes: {
      hmi: {
        section: 'balkon',
      },
    },
    disable: true,
    host: '10.97.4.70',
    metrics: ['temperature', 'pressure', 'humidity', 'brightness'],
    name: 'balkon',
    port: 3000,
  },
  {
    attributes: {
      hmi: {
        category: 'ahu-in',
        section: 'ahu',
      },
    },
    host: '10.97.0.223',
    metrics: [
      'temperature',
      'pressure',
      'humidity',
      'co',
      'co2',
      'pm025',
      'pm10',
      'tvoc',
    ],
    name: 'ahuIn',
    port: 5045,
  },
  {
    attributes: {
      hmi: {
        category: 'ahu-out',
        section: 'ahu',
      },
    },
    host: '10.97.0.224',
    metrics: [
      'temperature',
      'pressure',
      'humidity',
      'co',
      'co2',
      'pm025',
      'pm10',
      'tvoc',
    ],
    name: 'ahuOut',
    port: 5045,
  },
];
