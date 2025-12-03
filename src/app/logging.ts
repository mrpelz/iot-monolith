import { stripIndents } from 'proper-tags';

import { RouteHandler } from '../lib/http-server.js';
import {
  CustomLevel,
  DevOutput,
  JournaldOutput,
  Level,
  Logger,
  LogWithLevelAndDate,
  VirtualOutput,
  // TelegramOutput,
} from '../lib/log.js';
import { isProd, logLevel } from './environment.js';

export const logger = new Logger();

const primaryOutput = isProd
  ? new JournaldOutput(logLevel ?? Level.INFO)
  : new DevOutput(logLevel ?? Level.DEBUG);

export const virtualOutput = new VirtualOutput(Level.INFO, 5000);

export const httpLogHandler =
  (output: VirtualOutput): RouteHandler =>
  ({ response, url, utils }) => {
    if (utils.constrainMethod('GET')) return;

    const cursor = url.searchParams.get('cursor');

    let logs: [string, LogWithLevelAndDate][] = [];

    try {
      logs = cursor ? output.getLogsAfterId(cursor) : output.logs;
    } catch (error) {
      utils.internalServerError(stripIndents`
        Error retrieving logs: ${error}
      `);

      return;
    }

    response.setHeader('Content-Type', 'application/json;charset=utf-8');
    response.end(
      JSON.stringify(
        logs.map(([id, { date, ...log }]) => [
          id,
          {
            date: {
              date: date.toLocaleString('de-DE'),
              epoch: date.getTime(),
            },
            ...log,
          },
        ]),
      ),
    );
  };

export const logicReasoningLevel = new CustomLevel(Level.INFO);
export const logicReasoningOutput = new VirtualOutput(
  logicReasoningLevel,
  5000,
);

// const telegramLogOutput = new TelegramOutput(logLevel);

logger.addOutput(primaryOutput);
logger.addOutput(virtualOutput);
logger.addOutput(logicReasoningOutput);
// logger.addOutput(telegramLogOutput);
