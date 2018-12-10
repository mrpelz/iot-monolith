const { Security } = require('../../libs/security');

const {
  telegram
} = global;

const security = new Security({
  telegram
});

// initial arm in case of accidental crash
security.arm(true);

global.security = security;
