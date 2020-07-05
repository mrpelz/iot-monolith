/* eslint-disable no-console */
import { Logger } from '../index.js';
const globalLog = new Logger();
globalLog.friendlyName('log-test');
const log = globalLog.withPrefix('test');
log.debug({
    head: 'testing debug',
    value: true
});
log.info({
    head: 'testing info',
    value: false
});
log.notice('testing notice');
log.warning({
    head: 'testing warning',
    value: true
});
log.error({
    head: 'testing error',
    value: false
});
log.error({
    head: 'testing error without telegram',
    telegram: false
});
log.critical('testing critical');
log.alert('testing alert');
log.emergency('testing emerg');
log.debug({
    head: 'testing debug with forced telegram',
    telegram: true
});
log.info({
    head: 'testing info with forced telegram',
    value: true,
    telegram: true
});
log.debug({
    head: 'testing debug with forced telegram and attachment',
    attachment: 'Dies ist ein\nmehrzeiliges\nAttachment',
    telegram: true
});
//# sourceMappingURL=index.js.map