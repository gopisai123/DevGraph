import { cypherInteger, runQuery } from '../db/neo4j.js';
import { requiredString } from '../lib/http.js';
import { node, scalar } from '../lib/serialize.js';

export async function repositoriesForTechnology(technology, limit, execute = runQuery) {
  const name = requiredString(technology, 'technology');
  const result = await execute(`MATCH (s:Skill)<-[:USES_SKILL]-(r:Repository)
    WHERE toLower(s.name) = toLower($name)
    RETURN r ORDER BY r.stars DESC, r.full_name LIMIT $limit`, { name, limit: cypherInteger(limit) });
  return result.records.map((record) => node(record.get('r')));
}
export async function sharedTechnologies(limit, execute = runQuery) {
  const result = await execute(`MATCH (r:Repository)-[:USES_SKILL]->(s:Skill)
    WITH s, count(DISTINCT r) AS repositoryCount WHERE repositoryCount > 1
    RETURN s.name AS technology, s.domain AS domain, repositoryCount ORDER BY repositoryCount DESC, technology LIMIT $limit`, { limit: cypherInteger(limit) });
  return result.records.map((record) => ({ technology: record.get('technology'), domain: record.get('domain'), repositories: scalar(record.get('repositoryCount')) }));
}
export async function similarRepositories(fullName, limit, execute = runQuery) {
  const repository = requiredString(fullName, 'full_name');
  const result = await execute(`MATCH (source:Repository {full_name: $repository})-[:USES_SKILL]->(skill:Skill)<-[:USES_SKILL]-(candidate:Repository)
    WHERE candidate <> source
    WITH candidate, collect(DISTINCT skill.name) AS sharedTechnologies
    RETURN candidate, sharedTechnologies ORDER BY size(sharedTechnologies) DESC, candidate.full_name LIMIT $limit`, { repository, limit: cypherInteger(limit) });
  return result.records.map((record) => ({ repository: node(record.get('candidate')), sharedTechnologies: record.get('sharedTechnologies') }));
}
