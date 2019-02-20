const { Security } = require('../../libs/security');
const { getKey } = require('../../libs/utils/structures');

function createSecurity(telegram) {
  try {
    return new Security({
      telegram
    });
  } catch (e) {
    return null;
  }
}

function addPersistenceHandler(instance, securityDb) {
  const handleChange = () => {
    securityDb.armed = instance.armed;
  };

  const handleInit = () => {
    const {
      armed = true
    } = securityDb || {};

    instance.arm(armed);

    instance.on('change', handleChange);
    handleChange();
  };

  handleInit();
}

(function main() {
  const {
    db,
    telegram
  } = global;

  const securityDb = getKey(db, 'security');

  const security = createSecurity(telegram);

  if (!security) return;

  addPersistenceHandler(security, securityDb);
  global.security = security;
}());
