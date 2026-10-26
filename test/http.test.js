import test from 'node:test';
import assert from 'node:assert/strict';
import { positiveInt, requiredString, AppError } from '../src/lib/http.js';

test('positiveInt returns fallback and accepts bounded integers', () => {
  assert.equal(positiveInt(undefined), 50); assert.equal(positiveInt('12', 50, 20), 12);
});
test('positiveInt rejects unsafe limits', () => assert.throws(() => positiveInt('1000', 50, 20), AppError));
test('requiredString trims valid text and rejects blank values', () => {
  assert.equal(requiredString(' hello ', 'name'), 'hello'); assert.throws(() => requiredString(' ', 'name'), AppError);
});
