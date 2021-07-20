/* eslint-disable no-console */
import { DevOutput, Logger } from '../log.js';

const globalLogger = new Logger();
const devOutput = new DevOutput();

globalLogger.addOutput(devOutput);

const logger = globalLogger.getInput({
  head: 'log-tests',
});

logger.debug(() => 'testing debug');

logger.info(() => 'testing info');

logger.notice(() => 'testing notice');

logger.warning(() => 'testing warning');

logger.error(() => 'testing error');

logger.error(() => ({ body: 'testing error' }));

logger.critical(() => 'testing critical');

logger.alert(() => 'testing alert');

logger.emergency(() => 'testing emerg');

logger.debug(() => ({
  body: 'testing debug with overridden head',
  head: 'new headline',
}));
