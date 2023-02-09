/* eslint-disable no-console */
import { DevOutput, Logger, callstack } from '../log.js';

const globalLogger = new Logger();
const devOutput = new DevOutput();

globalLogger.addOutput(devOutput);

const logger = globalLogger.getInput({
  head: 'log-tests',
});

logger.debug(() => 'testing debug');

logger.info(() => 'testing info');

logger.notice(() => 'testing notice');

logger.warning(() => 'testing warning', callstack());

logger.error(() => 'testing error', callstack());

logger.error(() => ({ body: 'testing error' }), callstack());

logger.critical(() => 'testing critical', callstack());

logger.alert(() => 'testing alert', callstack());

logger.emergency(() => 'testing emerg', callstack());

logger.debug(() => ({
  body: 'testing debug with overridden head',
  head: 'new headline',
}));
