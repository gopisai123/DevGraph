import { app } from './app.js';
import { config } from './config.js';
import { closeDriver } from './db/neo4j.js';

const server = app.listen(config.port, () => console.log(`DevGraph API listening on http://localhost:${config.port}`));
async function shutdown() { server.close(async () => { await closeDriver(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
