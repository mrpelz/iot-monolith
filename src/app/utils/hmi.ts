import { HmiElement, HmiServer } from '../../lib/hmi/index.js';
import { PersistentSocket, ReliableSocket } from '../../lib/tcp/index.js';
import { HistoryState } from '../modules/histories.js';
import { Timer } from '../../lib/utils/time.js';
import { camel } from '../../lib/utils/string.js';
import { excludeKeys } from '../../lib/utils/structures.js';

type ConectionElement = {
  name: string;
  instance: ReliableSocket | PersistentSocket;
};

export function setUpConnectionHmi(
  element: ConectionElement,
  subGroup: string,
  hmiServer: HmiServer
): void {
  const { name, instance } = element;

  let connected = false;

  const hmi = new HmiElement({
    attributes: {
      category: 'connections',
      group: camel(name, 'connection'),
      section: 'tech',
      setType: 'trigger',
      showSubGroup: Boolean(subGroup),
      subGroup,
      type: 'connection',
    },
    getter: async () => {
      return connected ? 'connected' : 'disconnected';
    },
    name: camel(name, 'connection'),
    server: hmiServer,
    settable: true,
  });

  instance.on('connect', () => {
    connected = true;
    hmi.update();
  });
  instance.on('disconnect', () => {
    connected = false;
    hmi.update();
  });

  hmi.on('set', () => {
    instance.reconnect();
  });
}

export function setUpHistoryTrendHmi(
  histories: HistoryState[],
  hmiName: string,
  attributes: Record<string, string | null | undefined>,
  hmiServer: HmiServer,
  trendFactorThreshold: number
): void {
  const history = histories.find(({ name: n }) => {
    return n === hmiName;
  });

  if (!history) return;

  const trend = async () => {
    const { factor } = history.trend.get();

    if (factor === null) return false;

    if (factor > trendFactorThreshold) return 'trendUp';
    if (factor < trendFactorThreshold * -1) return 'trendDown';
    return false;
  };

  /* eslint-disable-next-line no-new */
  new HmiElement({
    attributes: excludeKeys(
      {
        ...attributes,
        subType: 'trend',
      },
      'unit'
    ),
    getter: trend,
    name: camel(hmiName, 'trend'),
    server: hmiServer,
  });
}

export function setUpLightTimerHmi(
  timer: Timer | undefined,
  name: string,
  attributes: Record<string, string | null | undefined>,
  hmiServer: HmiServer
): HmiElement | null {
  if (!timer) return null;

  const hmiTimer = new HmiElement({
    attributes: {
      ...attributes,
      group: camel(attributes.group, 'timer'),
      subGroup: 'timer',
    },
    getter: () => {
      return Promise.resolve(
        (() => {
          if (!timer.isEnabled) return 'inactive';
          if (!timer.isRunning) return 'off';
          return 'on';
        })()
      );
    },
    name: camel(name, 'timer'),
    server: hmiServer,
    settable: true,
  });

  hmiTimer.on('set', () => {
    if (timer.isEnabled) {
      timer.disable();
    } else {
      timer.enable();
    }
  });

  timer.on('change', () => {
    hmiTimer.update();
  });

  return hmiTimer;
}
