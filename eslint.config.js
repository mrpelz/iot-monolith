import {
  config as configUpstream,
  configMeta,
  // @ts-ignore
} from '@mrpelz/boilerplate-node/eslint.config.js';
import { deepmerge } from 'deepmerge-ts';

/** @type {import('eslint').Linter.Config} */
export const config = deepmerge({}, configUpstream);

if (config.rules) {
  config.rules['unicorn/consistent-boolean-name'] = 'off';
  config.rules['unicorn/consistent-class-member-order'] = 'off';
  config.rules['unicorn/max-nested-calls'] = 'off';
  config.rules['unicorn/name-replacements'] = 'off';
  config.rules['unicorn/no-break-in-nested-loop'] = 'off';
  config.rules['unicorn/no-computed-property-existence-check'] = 'off';
  config.rules['unicorn/no-declarations-before-early-exit'] = 'off';
  config.rules['unicorn/no-non-function-verb-prefix'] = 'off';
  config.rules['unicorn/no-return-array-push'] = 'off';
  config.rules['unicorn/no-top-level-assignment-in-function'] = 'off';
  config.rules['unicorn/no-top-level-side-effects'] = 'off';
  config.rules['unicorn/no-unreadable-for-of-expression'] = 'off';
  config.rules['unicorn/no-unreadable-object-destructuring'] = 'off';
  config.rules['unicorn/no-useless-template-literals'] = 'off';
  config.rules['unicorn/numeric-separators-style'] = 'off';
  config.rules['unicorn/prefer-array-from-map'] = 'off';
  config.rules['unicorn/prefer-await'] = 'off';
  config.rules['unicorn/prefer-boolean-return'] = 'off';
  config.rules['unicorn/prefer-direct-iteration'] = 'off';
  config.rules['unicorn/prefer-early-return'] = 'off';
  config.rules['unicorn/prefer-global-number-constants'] = 'off';
  config.rules['unicorn/prefer-https'] = 'off';
  config.rules['unicorn/prefer-number-coercion'] = 'off';
  config.rules['unicorn/prefer-private-class-fields'] = 'off';
  config.rules['unicorn/prefer-queue-microtask'] = 'off';
  config.rules['unicorn/prefer-split-limit'] = 'off';
}

/** @type {import('eslint').Linter.Config[]} */
export default [configMeta, config];
