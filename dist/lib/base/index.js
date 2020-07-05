import { EventEmitter } from 'events';
import { Logger } from '../log/index.js';
export class Base extends EventEmitter {
    constructor() {
        super();
        this.log = new Logger();
    }
}
//# sourceMappingURL=index.js.map