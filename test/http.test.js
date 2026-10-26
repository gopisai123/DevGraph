import test from 'node:test';
import assert from 'node:assert/strict';
import { positiveInt, requiredString, AppError } from '../src/lib/http.js';
import { cypherInteger } from '../src/db/neo4j.js';

test('positiveInt returns fallback and accepts bounded integers', () => {
  assert.equal(positiveInt(undefined), 50); assert.equal(positiveInt('12', 50, 20), 12);
});
test('positiveInt rejects unsafe limits', () => assert.throws(() => positiveInt('1000', 50, 20), AppError));
test('integer limits are encoded as Neo4j Integer values, not Float values', () => {
  const limit = cypherInteger(100);
  assert.equal(limit.toNumber(), 100);
  assert.equal(typeof limit, 'object');
  assert.throws(() => cypherInteger(100.5), TypeError);
  assert.throws(() => positiveInt('100.5', 50, 200), AppError);
});
test('requiredString trims valid text and rejects blank values', () => {
  assert.equal(requiredString(' hello ', 'name'), 'hello'); assert.throws(() => requiredString(' ', 'name'), AppError);
});
