# DevGraph backend

An independent Node.js/Express REST API for exploring developers, repositories, topics, skills, and their Neo4j graph relationships. It contains no frontend dependency. GitHub ingestion is deliberately not implemented yet; credentials are neither required nor exposed.

## Install and run

Prerequisites: Node.js 20+ and Neo4j 5.x (Desktop, Aura, or server). In PowerShell:

```powershell
Copy-Item .env.example .env
npm install
# edit .env with the URI and credentials for your Neo4j database
npm run schema
npm run seed
npm run dev
```

`npm run schema` and `npm run seed` load Neo4j values from `.env` and use `cypher-shell`, which comes with a Neo4j installation and must be on `PATH`. If it is unavailable, paste the contents of `database/schema.cypher`, then `database/seed.cypher`, into Neo4j Browser. Start normally with `npm start`. Run unit tests with `npm test`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `3000`) |
| `NEO4J_URI` | Neo4j Desktop: `bolt://localhost:7687`; Aura: its supplied `neo4j+s://` URI |
| `NEO4J_USERNAME`, `NEO4J_PASSWORD` | database credentials |
| `NEO4J_DATABASE` | database name, default `neo4j` |
| `MAX_GRAPH_NODES` | hard cap for graph relationship results |

The seed uses `MERGE`, so it can be run repeatedly. It does not remove existing data.

## API contract

All responses are JSON. Successful entity responses are `{ "data": ... }`; errors are `{ "error": { "message": "..." } }`. Future React/Vite clients should URL-encode path IDs such as repository `full_name` (`ada-lovelace%2Fgraph-lab`).

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | verifies Neo4j connectivity |
| `GET /api/stats` | counts each node type |
| `GET /api/developers?limit=50` | list developers |
| `GET /api/developers/:username` | get developer |
| `GET /api/repositories?limit=50` | list repositories |
| `GET /api/repositories/:full_name` | get repository |
| `GET /api/topics`, `GET /api/skills` | list taxonomy resources |
| `GET /api/graph?limit=100` | `{nodes, edges}` visualization payload |
| `GET /api/path?from=<elementId>&to=<elementId>&maxDepth=6` | shortest undirected graph path |
| `GET /api/skills/gaps?username=ada-lovelace&limit=20` | adjacent skills not yet used by developer |
| `POST /api/{developers|repositories|topics|skills}` | create a node |
| `PATCH /api/{developers|repositories|topics|skills}/:id` | update supported fields |
| `DELETE /api/{developers|repositories|topics|skills}/:id` | delete node and relationships |

Example:

```powershell
Invoke-RestMethod http://localhost:3000/api/graph
Invoke-RestMethod http://localhost:3000/api/skills/gaps?username=ada-lovelace
Invoke-RestMethod -Method Post http://localhost:3000/api/topics -ContentType application/json -Body '{"name":"devops","category":"engineering"}'
```

Node IDs in `/api/graph` are Neo4j `elementId` strings and are the input to `/api/path`. Entity routes use their natural unique property (`username`, `full_name`, or `name`). `POST` validates required natural IDs; numeric counts must be non-negative integers. Cypher values are parameterized, graph/list result sizes are bounded, and every driver session is closed in `finally`.

## Database resources

- `database/schema.cypher`: constraints and lookup indexes.
- `database/seed.cypher`: repeatable sample graph.
- `database/queries.cypher`: reusable exploration query reference.

## Troubleshooting

- **Health returns 500 / config missing:** copy `.env.example` to `.env`, then supply all `NEO4J_*` values.
- **Connection refused:** start Neo4j and confirm the Bolt URI/port; Aura usually requires its provided `neo4j+s://` URI.
- **`cypher-shell` not found:** use Neo4j Browser as described above, or add Neo4j's `bin` folder to `PATH`.
- **404 for a repository:** encode its slash in clients (`encodeURIComponent(full_name)`).

Database-connected endpoint tests require a running configured Neo4j instance and are intentionally not run by the unit suite.
