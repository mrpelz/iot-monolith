const {
  lstatSync: lstat,
  readdirSync: readdir,
  readFileSync: readFile
} = require('fs');
const {
  join: pathJoin,
  basename,
  extname
} = require('path');

function readConfig() {
  const result = {};

  readdir(__dirname).forEach((fileName) => {
    const path = pathJoin(__dirname, fileName);
    const stat = lstat(path);

    if (!stat.isFile()) return;
    if (extname(path) !== '.json') return;

    const name = basename(fileName, '.json');

    try {
      const payload = readFile(path, { encoding: 'utf8' });
      const config = JSON.parse(payload);

      result[name] = config;
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.log(`<3>could not read config "${fileName}" / ${e}`);
    }
  });

  global.config = result;
}

module.exports = {
  readConfig
};
