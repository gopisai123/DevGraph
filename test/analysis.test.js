import test from 'node:test';
import assert from 'node:assert/strict';
import { repositoriesForTechnology, sharedTechnologies, similarRepositories } from '../src/services/analysis.js';

const repository = { elementId: '4:1', labels: ['Repository'], properties: { full_name: 'acme/demo', name: 'demo' } };

test('technology search is parameterized and only returns stored repository matches', async () => {
  let seen;
  const execute = async (query, parameters) => { seen = { query, parameters }; return { records: [{ get: () => repository }] }; };
  const result = await repositoriesForTechnology('JavaScript', 20, execute);
  assert.equal(result[0].full_name, 'acme/demo');
  assert.equal(seen.parameters.name, 'JavaScript');
  assert.match(seen.query, /USES_SKILL/);
});

test('shared and similar technology analysis retain graph evidence', async () => {
  const integer = (number) => ({ toNumber: () => number });
  const shared = await sharedTechnologies(10, async () => ({ records: [{ get: (key) => ({ technology: 'JavaScript', domain: 'programming', repositoryCount: integer(2) })[key] }] }));
  assert.deepEqual(shared, [{ technology: 'JavaScript', domain: 'programming', repositories: 2 }]);
  const similar = await similarRepositories('acme/demo', 10, async () => ({ records: [{ get: (key) => ({ candidate: repository, sharedTechnologies: ['JavaScript', 'express'] })[key] }] }));
  assert.deepEqual(similar[0].sharedTechnologies, ['JavaScript', 'express']);
});
