# DevGraph

DevGraph is a developer and repository explorer backed by Neo4j. It imports public GitHub repository data into a graph, then lets you explore developers, repositories, technologies, topics, and the relationships between them.

## What it does

- **Dashboard:** See graph totals and a live network preview.
- **Graph explorer:** Search and filter graph nodes by type and relationship; select a node to inspect its data.
- **GitHub import:** Preview a public repository before importing its metadata, languages, topics, and detected dependencies.
- **Developer and repository directories:** Browse and search stored developers and repositories.
- **Skills and topics:** Browse technology/skill and topic nodes in the graph.
- **Learning paths:** Find the shortest stored graph connection between two skills or topics. A path is a graph connection, not necessarily a course or prerequisite sequence.
- **Skill-gap analysis:** Find skills connected through related repository topics. Results are evidence-based suggestions, not claims about a developer's abilities.
- **AI status:** Check whether optional AI-provider settings are present. The graph, import, path, and gap features work without an AI key; this page does not currently generate AI analyses.

### Data and provenance

GitHub imports support public `https://github.com/owner/repository` URLs. DevGraph fetches repository metadata, languages, topics, and supported dependency files (`package.json`, `requirements.txt`, and `pyproject.toml`). It records imported relationships with provenance so observed GitHub metadata can be distinguished from inferred language and dependency links.

The graph uses these node types: `Developer`, `Repository`, `Topic`, and `Skill`. Common relationships include `OWNS`, `HAS_TOPIC`, `USES_SKILL`, and `RELATED_TO`.

## Requirements

- Node.js and npm
- Neo4j 5.x, running locally or reachable over Bolt
- A GitHub token is optional; it can help with GitHub API rate limits

## Get started

Run these commands from the repository root in PowerShell:

1. Install backend dependencies:

   ```powershell
   npm install
   ```

2. Create your local environment file and set the Neo4j password:

   ```powershell
   Copy-Item .env.example .env
   ```

   Edit `.env` and set `NEO4J_PASSWORD` to the password for your Neo4j user. Update the connection settings if Neo4j is not available at `bolt://localhost:7687`.

3. Create the graph constraints and indexes, then load the sample data:

   ```powershell
   npm run schema
   npm run seed
   ```

   The seed uses `MERGE`, so rerunning it does not first delete existing graph data.

4. Start the API:

   ```powershell
   npm run dev
   ```

5. In a second terminal, install and start the frontend:

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

6. Open the Vite URL shown in the frontend terminal (normally <http://localhost:5173>). The Vite development server proxies `/api` requests to the backend at `http://localhost:3000`.

To run the backend without watch mode, use `npm start` from the repository root.

## Configuration

Copy `.env.example` to `.env`. The backend loads this file at startup.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend HTTP port. |
| `NODE_ENV` | `development` | Node environment label. |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt connection URI. |
| `NEO4J_USERNAME` | `neo4j` | Neo4j username. |
| `NEO4J_PASSWORD` | — | Neo4j password; required for database access. |
| `NEO4J_DATABASE` | `neo4j` | Neo4j database name. |
| `GRAPH_MAX_NODES` | `1000` | Maximum number of relationships returned for one graph visualization/API response (maximum configurable value: `10000`). This does not limit imports or stored graph data. |
| `GITHUB_TOKEN` | — | Optional token used for GitHub API requests. Keep it private and do not commit `.env`. |
| `AI_PROVIDER` | — | Optional AI provider indicator. The status UI currently recognizes `gemini`. |
| `GEMINI_API_KEY` | — | Optional Gemini key; keep it private and do not expose it in frontend code. |
| `AI_MODEL` | — | Optional model setting for a future provider-backed analysis workflow. |

## API reference

All endpoints are prefixed with `/api`. Successful responses generally return JSON in a `data` property. Errors return `{ "error": { "message": "..." } }`.

### Health and graph

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check API and Neo4j connectivity. |
| `GET` | `/api/stats` | Count developers, repositories, topics, skills, and relationships. |
| `GET` | `/api/graph?limit=1000` | Fetch a bounded graph for visualization. The default comes from `GRAPH_MAX_NODES`. |
| `GET` | `/api/path?from={nodeId}&to={nodeId}&maxDepth=6` | Find a shortest stored path between Neo4j element IDs. `maxDepth` must be between 1 and 10. |

`/api/graph` reports whether its result may be truncated in `meta.truncated`. Its limit only applies to this response; it does not cap database storage or GitHub imports.

### Entities

The following entity endpoints support `GET /api/{type}`, `GET /api/{type}/{key}`, `POST /api/{type}`, `PATCH /api/{type}/{key}`, and `DELETE /api/{type}/{key}`:

| Type | Lookup key | Supported properties |
|---|---|---|
| `developers` | `username` | `username`, `bio`, `public_repos` |
| `repositories` | `full_name` | `full_name`, `name`, `stars`, `language` |
| `topics` | `name` | `name`, `category` |
| `skills` | `name` | `name`, `level`, `domain` |

List requests accept an optional `limit` query parameter (default `50`, maximum `200`). Create and update requests take a JSON object containing supported properties. Create returns `201`; delete returns `204` when successful. The `{key}` in these entity URLs is the entity's lookup property, not the graph element ID.

Example:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/developers `
  -ContentType 'application/json' `
  -Body '{"username":"octocat","bio":"Open source developer","public_repos":10}'
```

### Import, analysis, and status

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/import/github/preview` | Preview a repository without saving it. Body: `{"repositoryUrl":"https://github.com/owner/repository"}` |
| `POST` | `/api/import/github` | Import repository metadata and graph relationships. Uses the same JSON body. |
| `GET` | `/api/ai/status` | Report whether the optional AI provider settings are configured. |
| `GET` | `/api/technologies/repositories?name=TypeScript&limit=50` | Find repositories using a technology/skill. |
| `GET` | `/api/technologies/shared?limit=50` | List technologies used by multiple repositories. |
| `GET` | `/api/repositories/{fullName}/similar?limit=20` | Find repositories with shared technologies. URL-encode `fullName` when necessary. |
| `GET` | `/api/skills/gaps?username={username}&limit=20` | Return graph-supported skill opportunities for a developer. |

Analysis results reflect data currently stored in Neo4j; they are not external assessments of a person's skills.

## Development

From the repository root:

| Command | Description |
|---|---|
| `npm run dev` | Start the backend with Node watch mode. |
| `npm start` | Start the backend normally. |
| `npm test` | Run backend tests with Node's built-in test runner. |
| `npm run schema` | Apply `database/schema.cypher` to Neo4j. |
| `npm run seed` | Load sample graph data from `database/seed.cypher`. |

From `frontend`:

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build the frontend for production. |
| `npm run preview` | Preview the production build locally. |

## Project layout

```text
database/       Neo4j schema, sample seed, and example queries
frontend/       React, TypeScript, and Vite application
scripts/        Cypher script runner
src/
  app.js        Express app, middleware, and error responses
  server.js     HTTP server startup and graceful shutdown
  config.js     Environment configuration
  db/           Neo4j driver and query helpers
  lib/          HTTP validation and graph serialization
  routes/       REST API endpoints
  services/     Entity, GitHub import, and graph-analysis logic
test/           Backend unit tests
```

## Troubleshooting

- **Backend reports missing Neo4j configuration:** Confirm `.env` exists in the repository root and contains `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD`.
- **Neo4j connection fails:** Make sure Neo4j is running, its Bolt URI and credentials match `.env`, and the configured database exists.
- **Frontend cannot reach the API:** Run the backend on port `3000` (or update the Vite proxy in `frontend/vite.config.ts` to match `PORT`).
- **GitHub import is rate-limited:** Configure `GITHUB_TOKEN` in the backend `.env` and restart the backend. Do not put the token in frontend configuration.
- **Graph looks empty:** Run `npm run schema` and `npm run seed`, or import a public repository from the app.
