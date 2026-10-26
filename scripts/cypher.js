import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import neo4j from 'neo4j-driver';

/** Splits only at delimiters outside Cypher strings, identifiers, and comments. */
export function splitCypherStatements(source) {
  const statements = [];
  let start = 0;
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === 'lineComment') { if (character === '\n' || character === '\r') state = 'code'; continue; }
    if (state === 'blockComment') { if (character === '*' && next === '/') { state = 'code'; index += 1; } continue; }
    if (state === 'singleQuote') {
      if (character === '\\') { index += 1; continue; }
      if (character === "'" && next === "'") { index += 1; continue; }
      if (character === "'") state = 'code';
      continue;
    }
    if (state === 'doubleQuote') { if (character === '\\') { index += 1; continue; } if (character === '"') state = 'code'; continue; }
    if (state === 'backtick') { if (character === '`' && next === '`') { index += 1; continue; } if (character === '`') state = 'code'; continue; }
    if (character === '/' && next === '/') { state = 'lineComment'; index += 1; continue; }
    if (character === '/' && next === '*') { state = 'blockComment'; index += 1; continue; }
    if (character === "'") { state = 'singleQuote'; continue; }
    if (character === '"') { state = 'doubleQuote'; continue; }
    if (character === '`') { state = 'backtick'; continue; }
    if (character === ';') {
      const statement = source.slice(start, index).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }
  if (state !== 'code' && state !== 'lineComment') throw new Error(`Unterminated ${state} in Cypher script`);
  const finalStatement = source.slice(start).trim();
  if (finalStatement) statements.push(finalStatement);
  return statements;
}

export async function executeCypherFile(file) {
  const required = ['NEO4J_URI', 'NEO4J_USERNAME', 'NEO4J_PASSWORD', 'NEO4J_DATABASE'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(', ')}`);
  const statements = splitCypherStatements(await readFile(file, 'utf8'));
  if (!statements.length) throw new Error(`No Cypher statements found in ${file}`);
  const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD));
  let session;
  try {
    await driver.verifyConnectivity();
    session = driver.session({ database: process.env.NEO4J_DATABASE, defaultAccessMode: neo4j.session.WRITE });
    for (const statement of statements) await session.run(statement);
    return statements.length;
  } finally {
    if (session) await session.close();
    await driver.close();
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/cypher.js <file>');
  const count = await executeCypherFile(file);
  console.log(`Executed ${count} Cypher statement${count === 1 ? '' : 's'} from ${file}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(`Cypher execution failed: ${error.message}`); process.exitCode = 1; });
}
