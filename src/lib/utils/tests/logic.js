/* eslint-disable no-console */
import { PriorityValue } from '../logic.js';

console.log('→ creating instance with initial value on priority 0');
const value = new PriorityValue('initial');

const log = () => {
  console.log({ value: value.value, priority: value.priority });
};

log();

console.log('→ setting identical value on priority 1 (no change)');
value.set('initial', 1);
log();

console.log('→ setting new value on priority 2 (change)');
value.set('p2', 2);
log();

console.log('→ setting new value on priority 3 (change)');
value.set('p3', 3);
log();

console.log('→ setting new value on priority 5 (change)');
value.set('p5', 5);
log();

console.log('→ setting new value on priority 4 (no change)');
value.set('p4', 4);
log();

console.log('→ withdrawing priority 3 while priority 4 & 5 are available (no change)');
value.withdraw(3);
log();

console.log('→ withdrawing priority 5 while higher priority not available (change)');
value.withdraw(5);
log();

console.log('→ withdrawing priority 4 while higher priority not available (change)');
value.withdraw(4);
log();

console.log('→ withdrawing priority 2 while higher priority not available (change)');
value.withdraw(2);
log();

console.log('→ withdrawing priority 1 with same value as priority 0 (no change)');
value.withdraw(1);
log();

console.log('→ trying to withdraw priority 0 (throws)');
try {
  value.withdraw(0);
} catch (error) {
  console.log(error);
}
log();
