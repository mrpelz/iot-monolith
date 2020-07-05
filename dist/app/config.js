import { basename, extname, join as pathJoin } from 'path';
import { lstatSync as lstat, readFileSync as readFile, readdirSync as readdir } from 'fs';
export function readConfig(configPath) {
    const result = {};
    readdir(configPath).forEach((fileName) => {
        const path = pathJoin(configPath, fileName);
        const stat = lstat(path);
        if (!stat.isFile())
            return;
        if (extname(path) !== '.json')
            return;
        const name = basename(fileName, '.json');
        try {
            const payload = readFile(path, { encoding: 'utf8' });
            const config = JSON.parse(payload);
            result[name] = config;
        }
        catch (e) {
            /* eslint-disable-next-line no-console */
            console.log(`<3>could not read config "${fileName}" / ${e}`);
        }
    });
    return result;
}
//# sourceMappingURL=config.js.map