export default {
  dbWriteInterval: 'every:30:second',
  ePaper: {
    disabled: true,
    meta: {
      devices: {
        schlafzimmer: {
          lockLevel: 0,
          lockTime: 60,
          template: 'standard',
        },
      },
    },
    update: 'every:1:minute',
    updateOffset: -12000,
    url: 'http://localhost:8080/epaper/draw.php',
  },
  entryDoorMessage: 'Die Wohnungstür ist noch offen. ❗️',
  entryDoorTimeout: 60000,
  ev1527: [
    {
      disable: false,
      host: 'hermes.net.wurstsalat.cloud',
      port: 9009,
    },
    {
      disable: false,
      host: 'tim.net.wurstsalat.cloud',
      port: 9000,
    },
    {
      disable: false,
      host: 'flexo.net.wurstsalat.cloud',
      port: 9000,
    },
  ],
  fridgeMessage: 'Bitte mach den Kühlschrank zu. 🥶',
  fridgeTimeout: 20000,
  historyMetrics: [
    'brightness',
    'co',
    'co2',
    'eco2',
    'flow_rate',
    'humidity',
    'precipitation',
    'pressure',
    'pm025',
    'pm10',
    'temperature',
    'tvoc',
  ],
  historyRetainHours: 1,
  historyUpdate: 'every:10:second',
  httpHooksPort: 5557,
  lightGroupIntercepts: {
    duschbadLamps: [
      [5, null],
      [1, 5],
      [null, 1],
    ],
    wannenbadLamps: [
      [1, null],
      [null, 1],
    ],
  },
  metricSchedule: {
    co: 'every:5:minute',
    pm025: 'every:1:minute',
    pm10: 'every:1:minute',
  },
  prometheusPort: 5555,
  rfSwitchLongPressTimeout: 5000,
  schedulerPrecision: 125,
  sevenSegment: {
    disable: false,
    host: '10.97.0.227',
    name: 'sevenSegment',
    port: 5045,
  },
  webApiPort: 5556,
  webApiUpdate: 'every:5:second',
};
