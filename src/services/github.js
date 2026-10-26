import { AppError, requiredString } from '../lib/http.js';
import { runQuery } from '../db/neo4j.js';
import { node, scalar } from '../lib/serialize.js';

const API = 'https://api.github.com';
const dependencyFiles = ['package.json', 'requirements.txt', 'pyproject.toml'];
export function parseGitHubUrl(value) {
  const raw = requiredString(value, 'repositoryUrl'); let url;
  try { url = new URL(raw); } catch { throw new AppError(400, 'Enter a valid GitHub repository URL'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') throw new AppError(400, 'Only https://github.com/owner/repository URLs are supported');
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/');
  if (parts.length !== 2 || !parts.every(Boolean) || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) throw new AppError(400, 'Repository URL must include a valid owner and repository name');
  return { owner: parts[0], repo: parts[1], fullName: `${parts[0]}/${parts[1]}` };
}
export async function requestGitHub(path, fetchImpl = fetch) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'DevGraph', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
  try {
    const response = await fetchImpl(`${API}${path}`, { headers, signal: controller.signal });
    if (response.status === 401) throw new AppError(502, 'GitHub token was rejected. Check GITHUB_TOKEN.');
    if (response.status === 404) throw new AppError(404, 'GitHub repository or file was not found or is not public');
    if (response.status === 403 || response.status === 429) {
      const reset = response.headers?.get?.('x-ratelimit-reset');
      throw new AppError(429, reset ? `GitHub API rate limit reached. Retry after ${new Date(Number(reset) * 1000).toISOString()}.` : 'GitHub API rate limit reached. Try again later.');
    }
    if (!response.ok) throw new AppError(502, `GitHub request failed (${response.status})`);
    return response.json();
  } catch (error) { if (error?.name === 'AbortError') throw new AppError(504, 'GitHub request timed out'); if (error instanceof AppError) throw error; throw new AppError(502, 'Unable to reach GitHub'); }
  finally { clearTimeout(timeout); }
}
function dependencyNames(file, content) {
  if (!content) return [];
  if (file === 'package.json') { try { const json = JSON.parse(content); return Object.keys({ ...(json.dependencies || {}), ...(json.devDependencies || {}) }); } catch { return []; } }
  if (file === 'requirements.txt') return content.split(/\r?\n/).map((line) => line.trim().split(/[<>=!~[ ;]/)[0]).filter((name) => /^[A-Za-z0-9_.-]+$/.test(name));
  if (file === 'pyproject.toml') return [...content.matchAll(/['\"]([A-Za-z0-9_.-]+)(?:[<>=!~][^'\"]*)?['\"]/g)].map((match) => match[1]);
  return [];
}
async function optionalFile(owner, repo, file, fetchImpl) {
  try { const data = await requestGitHub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${file}`, fetchImpl); return data?.content ? Buffer.from(data.content, 'base64').toString('utf8').slice(0, 100_000) : ''; }
  catch (error) { if (error instanceof AppError && error.status === 404) return ''; throw error; }
}
export async function preview(repositoryUrl, { fetchImpl = fetch } = {}) {
  const { owner, repo } = parseGitHubUrl(repositoryUrl);
  const data = await requestGitHub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, fetchImpl);
  const languages = await requestGitHub(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`, fetchImpl);
  const files = await Promise.all(dependencyFiles.map(async (file) => [file, await optionalFile(owner, repo, file, fetchImpl)]));
  const dependencies = [...new Set(files.flatMap(([file, content]) => dependencyNames(file, content)))].slice(0, 75);
  const languageNames = [...new Set([...(Object.keys(languages || {})), ...(data.language ? [data.language] : [])])];
  return { full_name: data.full_name, name: data.name, owner: data.owner?.login, description: data.description || '', language: data.language || null, languages: languageNames, stars: data.stargazers_count || 0, forks: data.forks_count || 0, topics: data.topics || [], dependencies, html_url: data.html_url, source: 'github' };
}
export async function persistRepository(repository, execute = runQuery) {
  const result = await execute(`MERGE (d:Developer {username: $owner})
    ON CREATE SET d.bio = '', d.public_repos = 0
    MERGE (r:Repository {full_name: $full_name})
    SET r.name = $name, r.description = $description, r.language = $language, r.stars = $stars, r.forks = $forks, r.html_url = $html_url, r.source = 'github'
    MERGE (d)-[owns:OWNS]->(r) ON CREATE SET owns.provenance = 'github-metadata'
    WITH r, $topics AS topics, $languages AS languages, $dependencies AS dependencies
    FOREACH (topicName IN topics | MERGE (t:Topic {name: toLower(topicName)}) ON CREATE SET t.category = 'github-topic' MERGE (r)-[rt:HAS_TOPIC]->(t) ON CREATE SET rt.provenance = 'github-metadata')
    FOREACH (skillName IN languages | MERGE (s:Skill {name: skillName}) ON CREATE SET s.level = 'observed', s.domain = 'programming' MERGE (r)-[rs:USES_SKILL]->(s) ON CREATE SET rs.provenance = 'github-languages')
    FOREACH (dependencyName IN dependencies | MERGE (s:Skill {name: dependencyName}) ON CREATE SET s.level = 'inferred', s.domain = 'dependency' MERGE (r)-[rd:USES_SKILL]->(s) ON CREATE SET rd.provenance = 'dependency-file')
    RETURN r`, repository, 'WRITE');
  if (!result.records[0]) throw new AppError(502, 'Neo4j did not confirm repository persistence');
  const verification = await execute(`MATCH (r:Repository {full_name: $full_name})
    OPTIONAL MATCH (r)-[:HAS_TOPIC]->(t:Topic)
    OPTIONAL MATCH (r)-[:USES_SKILL]->(s:Skill)
    RETURN r, count(DISTINCT t) AS topicCount, count(DISTINCT s) AS skillCount`, { full_name: repository.full_name });
  if (!verification.records[0]) throw new AppError(502, 'Repository write could not be verified in Neo4j');
  const verified = verification.records[0];
  return { repository: node(verified.get('r')), persisted: true, topics: scalar(verified.get('topicCount')), skills: scalar(verified.get('skillCount')) };
}
export async function importRepository(repositoryUrl, options) { const metadata = await preview(repositoryUrl, options); return { ...(await persistRepository(metadata, options?.execute)), metadata }; }
