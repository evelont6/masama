import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/draft.js';
test('invalid saved step and monetary values recover safely', () => {
  assert.equal(validateDraft('step', 'ride', 'items'), 'items');
  for (const value of [-1, Infinity, '1000', {}]) assert.equal(validateDraft('taxValue', value, 0), 0);
});
test('malformed and duplicate saved entries cannot crash the bill', () => {
  const item = {id:'a', name:'Kopi', price:10000};
  assert.deepEqual(validateDraft('items', [null, 42, {}, item, item], []), [item]);
  assert.deepEqual(validateDraft('assignments', {a:null, b:['p', null]}, {}), {b:['p']});
});
