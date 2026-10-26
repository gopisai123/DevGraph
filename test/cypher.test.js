import test from 'node:test';
import assert from 'node:assert/strict';
import { splitCypherStatements } from '../scripts/cypher.js';

test('splits complete Cypher statements while preserving semicolons in literals', () => {
  const source = "CREATE (:Note {text: 'one; two'}); // a ; comment\nCREATE (`strange;label` {name: \"x;y\"});";
  assert.deepEqual(splitCypherStatements(source), [
    "CREATE (:Note {text: 'one; two'})",
    '// a ; comment\nCREATE (`strange;label` {name: "x;y"})'
  ]);
});

test('supports Cypher escaped quotes and reports unterminated content', () => {
  assert.deepEqual(splitCypherStatements("CREATE (:Note {text: 'it''s; fine'});"), ["CREATE (:Note {text: 'it''s; fine'})"]);
  assert.throws(() => splitCypherStatements("CREATE (:Note {text: 'unfinished})"), /Unterminated/);
});
