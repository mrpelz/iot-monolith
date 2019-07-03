/* eslint-disable no-console */
const { PriorityValue } = require('../logic');

console.log('→ creating instance with initial value on priority 0');
const value = new PriorityValue('initial');

const log = (verb) => {
  console.log(`${verb}:`, { value: value.value, priority: value.priority });
};

value.on('change', () => {
  log('change');
});
log('initial');

console.log('→ setting identical value on priority 1 (no change)');
value.set('initial', 1);

console.log('→ setting new value on priority 2 (change)');
value.set('p2', 2);

console.log('→ setting new value on priority 3 (change)');
const p3 = value.set('p3', 3);

console.log('→ setting new value on priority 5 (change)');
const p5 = value.set('p5', 5);

console.log('→ setting new value on priority 4 (no change)');
const p4 = value.set('p4', 4);

console.log('→ unsetting priority 3 while priority 4 & 5 are available (no change)');
p3.unset();

console.log('→ unsetting priority 5 while higher priority not available (change)');
p5.unset();

console.log('→ unsetting priority 4 while higher priority not available (change)');
p4.unset();

console.log('→ withdrawing priority 2 while higher priority not available (change)');
value.withdraw(2);

console.log('→ withdrawing priority 1 with same value as priority 0 (no change)');
value.withdraw(1);

console.log('→ trying to withdraw priority 0 (throws)');
try {
  value.withdraw(0);
} catch (error) {
  console.log(error);
}
