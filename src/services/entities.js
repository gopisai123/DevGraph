import { runQuery } from '../db/neo4j.js';
import { AppError, optionalInteger, requiredString } from '../lib/http.js';
import { node } from '../lib/serialize.js';

const TYPES = {
  developers: { label: 'Developer', key: 'username', fields: ['username', 'bio', 'public_repos'] },
  repositories: { label: 'Repository', key: 'full_name', fields: ['full_name', 'name', 'stars', 'language'] },
  topics: { label: 'Topic', key: 'name', fields: ['name', 'category'] },
  skills: { label: 'Skill', key: 'name', fields: ['name', 'level', 'domain'] }
};
function spec(type) { if (!TYPES[type]) throw new AppError(404, 'Unknown resource type'); return TYPES[type]; }
function clean(type, body, partial = false) {
  const { fields, key } = spec(type); const result = {};
  for (const field of fields) if (body[field] !== undefined) result[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
  if (!partial || result[key] !== undefined) result[key] = requiredString(result[key], key);
  if (type === 'developers' && result.public_repos !== undefined) optionalInteger(result.public_repos, 'public_repos');
  if (type === 'repositories' && result.stars !== undefined) optionalInteger(result.stars, 'stars');
  return result;
}
export async function list(type, limit) { const { label } = spec(type); const result = await runQuery(`MATCH (n:${label}) RETURN n ORDER BY n.${spec(type).key} LIMIT $limit`, { limit }); return result.records.map(r => node(r.get('n'))); }
export async function find(type, id) { const { label, key } = spec(type); const result = await runQuery(`MATCH (n:${label} {${key}: $id}) RETURN n`, { id }); return result.records[0] ? node(result.records[0].get('n')) : null; }
export async function create(type, body) { const { label, key } = spec(type); const properties = clean(type, body); const result = await runQuery(`CREATE (n:${label}) SET n = $properties RETURN n`, { properties }); return node(result.records[0].get('n')); }
export async function update(type, id, body) { const { label, key } = spec(type); const properties = clean(type, body, true); if (!Object.keys(properties).length) throw new AppError(400, 'At least one supported field is required'); const result = await runQuery(`MATCH (n:${label} {${key}: $id}) SET n += $properties RETURN n`, { id, properties }); return result.records[0] ? node(result.records[0].get('n')) : null; }
export async function remove(type, id) { const { label, key } = spec(type); const result = await runQuery(`MATCH (n:${label} {${key}: $id}) WITH n DETACH DELETE n RETURN count(n) AS deleted`, { id }); return result.records[0].get('deleted').toNumber() > 0; }
