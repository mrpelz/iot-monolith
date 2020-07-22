export default {
  attributes: {
    hmi: {
      section: 'global',
    },
  },
  disable: false,
  host: '10.97.0.225',
  humidityAutomation: {
    fullVentAbove: 40,
    fullVentMessage: 'Luftfeuchtigkeit zu hoch, Lüftung 100% 🚿',
    resetVentBelow: 35,
    resetVentMessage: 'Luftfeuchtigkeit gesunken, Lüftung reset 🚿',
    ventControlUpdate: 'every:10:second',
  },
  kackAutomation: {
    fullVentMessage: 'Kack-Button ausgelöst, Lüftung 100% 💩',
    resetVentMessage: 'Kacke verflogen, Lüftung reset 💩',
    timeout: 1800000,
  },
  name: 'ventController',
  port: 5045,
  setDefaultTimeout: 7200000,
};
