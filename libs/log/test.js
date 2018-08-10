/* eslint-disable no-console */
const { Logger } = require('./index');

const log = new Logger('log-test', 'test-instance');

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
log.emerg('testing emerg');

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
