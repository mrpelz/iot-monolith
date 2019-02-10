const { RecurringMoment } = require('../../libs/utils/time');
const { resolveAlways } = require('../../libs/utils/oop');

function schlafzimmerWakeWithFloodlight(lights, scheduler) {
  const lightMatch = lights.find((light) => {
    return light.name === 'schlafzimmerFloodlight';
  });

  if (!lightMatch) {
    throw new Error('could not find light');
  }

  const { instance: lightInstance } = lightMatch;

  const at0730onWeekdays = {
    minute: 30,
    hour: 7,
    day: (day) => {
      return day >= 1 && day <= 5;
    }
  };

  const action = () => {
    resolveAlways(lightInstance.setPower(true));
  };

  let alarmMoment = null;

  const disarm = () => {
    if (!alarmMoment) return;

    alarmMoment.removeListener('hit', action);
    alarmMoment.destroy();

    alarmMoment = null;
  };

  const arm = () => {
    if (alarmMoment) {
      disarm();
    }

    alarmMoment = new RecurringMoment(scheduler, at0730onWeekdays);
    alarmMoment.on('hit', action);
  };

  return {
    arm,
    disarm,
    get state() { return Boolean(alarmMoment); }
  };
}

(function main() {
  const {
    lights,
    scheduler
  } = global;

  global.floodlightAlarmClock = schlafzimmerWakeWithFloodlight(lights, scheduler);
}());
