import { HmiServer } from '../../lib/hmi/index.js';

export function create(_, data) {
  Object.assign(data, {
    hmiServer: new HmiServer()
  });
}
