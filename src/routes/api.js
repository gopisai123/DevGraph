import { Router } from 'express';
import { entityRouter } from './entities.js';
import { asyncHandler, AppError, positiveInt, requiredString } from '../lib/http.js';
import { cypherInteger, runQuery, verifyConnection } from '../db/neo4j.js';
import { node, relationship, scalar } from '../lib/serialize.js';
import { config } from '../config.js';
import * as github from '../services/github.js';
import * as analysis from '../services/analysis.js';

const router = Router();
router.get('/health', asyncHandler(async (_req, res) => { await verifyConnection(); res.json({ status: 'ok', database: 'neo4j' }); }));
router.get('/stats', asyncHandler(async (_req, res) => {
  const result = await runQuery(`MATCH (n) WITH labels(n)[0] AS label, count(*) AS count RETURN label, count`);
  const data = Object.fromEntries(result.records.map(r => [r.get('label'), scalar(r.get('count'))]));
  const rels = await runQuery('MATCH ()-[r]->() RETURN count(r) AS count');
  res.json({ data: { developers: data.Developer || 0, repositories: data.Repository || 0, topics: data.Topic || 0, skills: data.Skill || 0, relationships: scalar(rels.records[0].get('count')) } });
}));
router.post('/import/github/preview', asyncHandler(async (req, res) => res.json({ data: await github.preview(req.body?.repositoryUrl) })));
router.post('/import/github', asyncHandler(async (req, res) => res.status(201).json({ data: await github.importRepository(req.body?.repositoryUrl) })));
router.get('/ai/status', (_req, res) => res.json({ data: { configured: Boolean(process.env.GEMINI_API_KEY && process.env.AI_PROVIDER === 'gemini'), provider: process.env.AI_PROVIDER || null } }));
router.get('/technologies/repositories', asyncHandler(async (req, res) => res.json({ data: await analysis.repositoriesForTechnology(req.query.name, positiveInt(req.query.limit, 50, 200)) })));
router.get('/technologies/shared', asyncHandler(async (req, res) => res.json({ data: await analysis.sharedTechnologies(positiveInt(req.query.limit, 50, 200)) })));
router.get('/repositories/:fullName/similar', asyncHandler(async (req, res) => res.json({ data: await analysis.similarRepositories(req.params.fullName, positiveInt(req.query.limit, 20, 100)) })));
router.get('/graph', asyncHandler(async (req, res) => {
  // A response-size limit protects the browser renderer; imports do not use this setting.
  const limit = positiveInt(req.query.limit, config.graphMaxNodes, config.graphMaxNodes);
  const result = await runQuery('MATCH (source)-[rel]->(target) RETURN source, rel, target LIMIT $limit', { limit: cypherInteger(limit) });
  const nodes = new Map(); const edges = [];
  for (const r of result.records) { const source = node(r.get('source')); const target = node(r.get('target')); nodes.set(source.id, source); nodes.set(target.id, target); edges.push(relationship(r.get('rel'))); }
  res.json({ data: { nodes: [...nodes.values()], edges }, meta: { limit, truncated: result.records.length === limit } });
}));
router.get('/path', asyncHandler(async (req, res) => {
  const from = requiredString(req.query.from, 'from'); const to = requiredString(req.query.to, 'to');
  const maxDepth = positiveInt(req.query.maxDepth, 6, 10);
  const result = await runQuery('MATCH (from) WHERE elementId(from) = $from MATCH (to) WHERE elementId(to) = $to MATCH path = shortestPath((from)-[*..10]-(to)) WHERE length(path) <= $maxDepth RETURN nodes(path) AS nodes, relationships(path) AS relationships', { from, to, maxDepth: cypherInteger(maxDepth) });
  if (!result.records[0]) throw new AppError(404, 'No path found');
  const record = result.records[0]; res.json({ data: { nodes: record.get('nodes').map(node), edges: record.get('relationships').map(relationship) } });
}));
router.get('/skills/gaps', asyncHandler(async (req, res) => {
  const username = requiredString(req.query.username, 'username'); const limit = positiveInt(req.query.limit, 20, 100);
  const result = await runQuery(`MATCH (d:Developer {username: $username})-[:OWNS]->(:Repository)-[:HAS_TOPIC]->(t:Topic)
    MATCH (candidate:Skill)<-[:USES_SKILL]-(:Repository)-[:HAS_TOPIC]->(t)
    WHERE NOT EXISTS { MATCH (d)-[:OWNS]->(:Repository)-[:USES_SKILL]->(candidate) }
    RETURN candidate.name AS skill, candidate.domain AS domain, count(*) AS relevance ORDER BY relevance DESC, skill LIMIT $limit`, { username, limit: cypherInteger(limit) });
  res.json({ data: result.records.map(r => ({ skill: r.get('skill'), domain: r.get('domain'), relevance: scalar(r.get('relevance')) })) });
}));
router.use('/developers', entityRouter('developers'));
router.use('/repositories', entityRouter('repositories'));
router.use('/topics', entityRouter('topics'));
router.use('/skills', entityRouter('skills'));
export default router;
