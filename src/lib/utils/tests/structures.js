/* eslint-disable no-console */
import { findFlattenedDiff, flattenData } from '../structures.js';

const test1 = [
  {
    test: 1,
    test3: [{
      c: [
        [
          'test',
          'blah',
          'cock'
        ],
        2,
        3
      ],
      b: 3,
      a: 1
    }],
    test2: [{
      a: 1,
      b: 3,
      c: [
        [
          'test',
          'blah',
          'cock'
        ],
        2,
        9
      ]
    }]
  },
  'foo'
];

const test2 = [
  {
    test: 1,
    test3: [{
      c: [
        [
          'test',
          'blah',
          'cock'
        ],
        2,
        3
      ],
      b: 3,
      a: 1
    }],
    test2: [{
      a: 1,
      b: 3,
      c: [
        [
          'test',
          'blah',
          'cocc'
        ],
        2,
        3
      ]
    }],
    xxx: 3
  },
  'bar'
];

const test3 = {
  dies: {
    ist: {
      ein: {
        test: '!',
        wurstsalat: '!'
      }
    }
  }
};

const flat1 = flattenData(test1);
const flat2 = flattenData(test2);
const flat3 = flattenData(test3);

console.log('\n### FLAT ###');
console.log(flat1);
console.log(flat3);

console.log('\n### DIFF ###');
console.log(findFlattenedDiff(flat1, flat2));
