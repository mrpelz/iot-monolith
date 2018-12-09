const { Security } = require('../../libs/security');

const {
  telegram
} = global;

const security = new Security({
  telegram
});

global.security = security;
