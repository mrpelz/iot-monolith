/* eslint-disable no-console */
const { findFlattenedDiff, flattenData } = require('../structures');

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

const flat1 = flattenData(test1);
const flat2 = flattenData(test2);

console.log('\n### FLAT ###');
console.log(flat1);

console.log('\n### DIFF ###');
console.log(findFlattenedDiff(flat1, flat2));
