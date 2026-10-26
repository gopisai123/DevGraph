import neo4j from 'neo4j-driver';
import { config } from '../config.js';

let driver;

// The driver serializes plain JavaScript numbers as Cypher Float values.
// LIMIT and traversal-depth parameters require Cypher Integer values.
export function cypherInteger(value) {
  if (!Number.isSafeInteger(value)) throw new TypeError('Neo4j integer parameters must be safe integers');
  return neo4j.int(value);
}

export function getDriver() {
  if (!driver) {
    const { uri, username, password } = config.neo4j;
    if (!uri || !username || !password) throw new Error('Neo4j configuration is missing. Copy .env.example to .env.');
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  }
  return driver;
}

export async function runQuery(cypher, parameters = {}, mode = 'READ') {
  const session = getDriver().session({ database: config.neo4j.database, defaultAccessMode: neo4j.session[mode] });
  try { return await session.run(cypher, parameters); }
  finally { await session.close(); }
}

export async function verifyConnection() { await getDriver().verifyConnectivity(); }
export async function closeDriver() { if (driver) { await driver.close(); driver = undefined; } }
