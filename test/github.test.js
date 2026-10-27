import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/lib/http.js';
import { parseGitHubUrl, persistRepository, preview, requestGitHub } from '../src/services/github.js';

const response = (status, body, headers = new Map()) => ({ status, ok: status >= 200 && status < 300, headers: { get: (name) => headers.get(name) || null }, json: async () => body });

test('normalizes valid public GitHub repository URLs and rejects unsafe URLs', () => {
  assert.deepEqual(parseGitHubUrl('https://github.com/expressjs/express.git/'), { owner: 'expressjs', repo: 'express', fullName: 'expressjs/express' });
  assert.throws(() => parseGitHubUrl('https://example.com/a/b'), AppError);
  assert.throws(() => parseGitHubUrl('https://github.com/a/b/issues'), AppError);
});

test('preview reads repository metadata, language inventory, and dependency files', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.endsWith('/languages')) return response(200, { JavaScript: 100, TypeScript: 20 });
    if (url.endsWith('/contents/package.json')) return response(200, { content: Buffer.from(JSON.stringify({ dependencies: { express: '^5' }, devDependencies: { vitest: '^3' } })).toString('base64') });
    if (url.endsWith('/contents/requirements.txt') || url.endsWith('/contents/pyproject.toml')) return response(404, {});
    return response(200, { full_name: 'acme/demo', name: 'demo', owner: { login: 'acme' }, description: 'Demo', language: 'JavaScript', stargazers_count: 7, forks_count: 2, topics: ['web'], html_url: 'https://github.com/acme/demo' });
  };
  const data = await preview('https://github.com/acme/demo', { fetchImpl });
  assert.deepEqual(data.languages, ['JavaScript', 'TypeScript']);
  assert.deepEqual(data.dependencies.sort(), ['express', 'vitest']);
  assert.equal(calls.length, 5);
});

test('GitHub rate limits are surfaced instead of reported as successful imports', async () => {
  await assert.rejects(() => requestGitHub('/repos/acme/demo', async () => response(403, {}, new Map([['x-ratelimit-reset', '0']]))), (error) => error instanceof AppError && error.status === 429);
});

test('persistence uses MERGE provenance and verifies the saved repository', async () => {
  const calls = [];
  const repositoryNode = { elementId: '4:1', labels: ['Repository'], properties: { full_name: 'acme/demo', name: 'demo' } };
  const int = (value) => ({ toNumber: () => value });
  const execute = async (query, parameters, mode) => {
    calls.push({ query, parameters, mode });
    return calls.length === 1 ? { records: [{ get: () => repositoryNode }] } : { records: [{ get: (key) => ({ r: repositoryNode, topicCount: int(1), skillCount: int(3) })[key] }] };
  };
  const result = await persistRepository({ full_name: 'acme/demo', owner: 'acme', name: 'demo', description: '', language: 'JavaScript', languages: ['JavaScript'], topics: ['web'], dependencies: ['express'], stars: 1, forks: 0, html_url: 'https://github.com/acme/demo' }, execute);
  assert.equal(result.persisted, true);
  assert.equal(result.skills, 3);
  assert.equal(calls.length, 2);
  assert.match(calls[0].query, /MERGE \(r:Repository/);
  assert.match(calls[0].query, /provenance = 'github-languages'/);
  assert.equal(calls[0].mode, 'WRITE');
});

test('repository persistence does not impose the old 200-node visualization cap', async () => {
  const repositoryNode = { elementId: '4:2', labels: ['Repository'], properties: { full_name: 'acme/large-stack', name: 'large-stack' } };
  const integer = (value) => ({ toNumber: () => value });
  const calls = [];
  const execute = async (query, parameters) => {
    calls.push({ query, parameters });
    return calls.length === 1 ? { records: [{ get: () => repositoryNode }] } : { records: [{ get: (key) => ({ r: repositoryNode, topicCount: integer(205), skillCount: integer(250) })[key] }] };
  };
  const languages = Array.from({ length: 250 }, (_, index) => `technology-${index}`);
  const topics = Array.from({ length: 205 }, (_, index) => `topic-${index}`);
  const result = await persistRepository({ full_name: 'acme/large-stack', owner: 'acme', name: 'large-stack', description: '', language: 'technology-0', languages, topics, dependencies: [], stars: 0, forks: 0, html_url: 'https://github.com/acme/large-stack' }, execute);
  assert.equal(calls[0].parameters.languages.length, 250);
  assert.equal(calls[0].parameters.topics.length, 205);
  assert.equal(result.skills, 250);
  assert.doesNotMatch(calls[0].query, /LIMIT/i);
});
