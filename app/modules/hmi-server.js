const { HmiServer } = require('../../libs/hmi');

function create(_, data) {
  Object.assign(data, {
    hmiServer: new HmiServer()
  });
}

module.exports = {
  create
};
